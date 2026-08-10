jest.mock('../../src/modules/notifications/notification-deliveries.repository', () => ({
	createForNotification: jest.fn(),
	claimPending: jest.fn(),
	markTicketed: jest.fn(),
	markRetry: jest.fn(),
	markFailed: jest.fn(),
	claimReceipts: jest.fn(),
	deferReceipt: jest.fn(),
	markSent: jest.fn(),
	deleteDevice: jest.fn(),
}));

const repository =
	require('../../src/modules/notifications/notification-deliveries.repository');
const service =
	require('../../src/modules/notifications/notification-delivery.service');

function pending(overrides = {}) {
	return {
		id: '1',
		deviceId: '11',
		attemptCount: 0,
		pushToken: 'ExpoPushToken[aaaaaaaaaaaaaaaaaaaaaa]',
		title: 'Заголовок',
		body: 'Текст',
		payload: { notificationId: 1 },
		...overrides,
	};
}

describe('notification delivery service', () => {
	const now = new Date('2026-08-08T10:00:00.000Z');

	beforeEach(() => jest.clearAllMocks());

	test('stores Expo tickets and schedules receipt checks', async () => {
		repository.claimPending.mockResolvedValueOnce([pending()]);
		const adapter = {
			send: jest.fn().mockResolvedValueOnce([
				{ status: 'ok', id: 'ticket-1' },
			]),
		};

		await service.sendPending(adapter, { now });

		expect(adapter.send).toHaveBeenCalledWith([{
			to: 'ExpoPushToken[aaaaaaaaaaaaaaaaaaaaaa]',
			title: 'Заголовок',
			body: 'Текст',
			data: { notificationId: 1 },
		}]);
		expect(repository.markTicketed).toHaveBeenCalledWith(
			'1',
			'ticket-1',
			now,
			new Date('2026-08-08T10:15:00.000Z'),
		);
	});

	test('retries transient request failures without storing push tokens', async () => {
		repository.claimPending.mockResolvedValueOnce([pending()]);
		const adapter = {
			send: jest.fn().mockRejectedValueOnce(new Error(
			'Failed ExpoPushToken[aaaaaaaaaaaaaaaaaaaaaa]',
		)),
		};
		jest.spyOn(Math, 'random').mockReturnValue(0);

		await service.sendPending(adapter, { now });

		expect(repository.markRetry).toHaveBeenCalledWith(
			'1',
			0,
			'EXPO_REQUEST_FAILED',
			'Failed [REDACTED_PUSH_TOKEN]',
			new Date('2026-08-08T10:01:00.000Z'),
			now,
		);
		Math.random.mockRestore();
	});

	test('retries 429 and 5xx responses but fails a permanent 4xx response', async () => {
		expect(service.isRetryableRequestError({ response: { status: 429 } })).toBe(true);
		expect(service.isRetryableRequestError({ status: 503 })).toBe(true);
		expect(service.isRetryableRequestError({ response: { status: 400 } })).toBe(false);

		repository.claimPending.mockResolvedValueOnce([pending()]);
		const adapter = {
			send: jest.fn().mockRejectedValueOnce(Object.assign(
				new Error('Invalid request'),
				{ response: { status: 400 } },
			)),
		};
		await service.sendPending(adapter, { now });

		expect(repository.markRetry).not.toHaveBeenCalled();
		expect(repository.markFailed).toHaveBeenCalledWith(
			'1', 'EXPO_REQUEST_REJECTED', 'Invalid request', now,
		);
	});

	test('does not retry a permanent Expo ticket error', async () => {
		repository.claimPending.mockResolvedValueOnce([pending()]);
		const adapter = {
			send: jest.fn().mockResolvedValueOnce([{
				status: 'error',
				message: 'Message is too big',
				details: { error: 'MessageTooBig' },
			}]),
		};

		await service.sendPending(adapter, { now });

		expect(repository.markRetry).not.toHaveBeenCalled();
		expect(repository.markFailed).toHaveBeenCalledWith(
			'1', 'MessageTooBig', 'Message is too big', now,
		);
	});

	test('removes an unregistered device after a ticket error', async () => {
		repository.claimPending.mockResolvedValueOnce([pending()]);
		const adapter = {
			send: jest.fn().mockResolvedValueOnce([{
				status: 'error',
				message: 'Not registered',
				details: { error: 'DeviceNotRegistered' },
			}]),
		};

		await service.sendPending(adapter, { now });

		expect(repository.deleteDevice).toHaveBeenCalledWith('11');
		expect(repository.markFailed).toHaveBeenCalledWith(
			'1',
			'DeviceNotRegistered',
			'Not registered',
			now,
		);
	});

	test('marks a delivery and logical notification sent after an ok receipt', async () => {
		repository.claimReceipts.mockResolvedValueOnce([{
			id: '1',
			deviceId: '11',
			ticketId: 'ticket-1',
			ticketedAt: new Date('2026-08-08T09:45:00.000Z'),
		}]);
		const adapter = {
			getReceipts: jest.fn().mockResolvedValueOnce({
				'ticket-1': { status: 'ok' },
			}),
		};

		await service.checkReceipts(adapter, { now });

		expect(repository.markSent).toHaveBeenCalledWith('1', now);
	});

	test('fails a missing receipt after 24 hours', async () => {
		repository.claimReceipts.mockResolvedValueOnce([{
			id: '1',
			deviceId: '11',
			ticketId: 'ticket-1',
			ticketedAt: new Date('2026-08-07T09:59:59.000Z'),
		}]);
		const adapter = {
			getReceipts: jest.fn().mockResolvedValueOnce({}),
		};

		await service.checkReceipts(adapter, { now });

		expect(repository.markFailed).toHaveBeenCalledWith(
			'1',
			'EXPO_RECEIPT_EXPIRED',
			null,
			now,
		);
	});

	test('stops receipt retries after 24 hours even when Expo is unavailable', async () => {
		repository.claimReceipts.mockResolvedValueOnce([{
			id: '1',
			deviceId: '11',
			ticketId: 'ticket-1',
			ticketedAt: new Date('2026-08-07T09:59:59.000Z'),
		}]);
		const adapter = {
			getReceipts: jest.fn().mockRejectedValueOnce(new Error('Network error')),
		};

		await service.checkReceipts(adapter, { now });

		expect(repository.deferReceipt).not.toHaveBeenCalled();
		expect(repository.markFailed).toHaveBeenCalledWith(
			'1', 'EXPO_RECEIPT_EXPIRED', null, now,
		);
	});
});
