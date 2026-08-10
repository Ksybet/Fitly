const { ExpoPushAdapter } =
	require('../../src/modules/notifications/expo-push.adapter');

describe('Expo push adapter', () => {
	test('sends chunked messages and preserves ticket order', async () => {
		const client = {
			chunkPushNotifications: jest.fn(messages => [
				messages.slice(0, 1),
				messages.slice(1),
			]),
			sendPushNotificationsAsync: jest.fn()
				.mockResolvedValueOnce([{ status: 'ok', id: 'ticket-1' }])
				.mockResolvedValueOnce([{ status: 'ok', id: 'ticket-2' }]),
		};
		const adapter = new ExpoPushAdapter({ client });
		const messages = [
			{ to: 'ExpoPushToken[aaaaaaaaaaaaaaaaaaaaaa]', body: 'one' },
			{ to: 'ExpoPushToken[bbbbbbbbbbbbbbbbbbbbbb]', body: 'two' },
		];

		await expect(adapter.send(messages)).resolves.toEqual([
			{ status: 'ok', id: 'ticket-1' },
			{ status: 'ok', id: 'ticket-2' },
		]);
		expect(client.sendPushNotificationsAsync).toHaveBeenCalledTimes(2);
	});

	test('loads receipt chunks into one result map', async () => {
		const client = {
			chunkPushNotificationReceiptIds: jest.fn(() => [
				['ticket-1'],
				['ticket-2'],
			]),
			getPushNotificationReceiptsAsync: jest.fn()
				.mockResolvedValueOnce({ 'ticket-1': { status: 'ok' } })
				.mockResolvedValueOnce({
					'ticket-2': {
						status: 'error',
						details: { error: 'DeviceNotRegistered' },
					},
				}),
		};
		const adapter = new ExpoPushAdapter({ client });

		await expect(adapter.getReceipts(['ticket-1', 'ticket-2']))
			.resolves.toEqual({
				'ticket-1': { status: 'ok' },
				'ticket-2': {
					status: 'error',
					details: { error: 'DeviceNotRegistered' },
				},
			});
	});
});
