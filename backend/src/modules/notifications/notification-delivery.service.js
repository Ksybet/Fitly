const deliveriesRepository = require('./notification-deliveries.repository');

const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const RECEIPT_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000];

function redactedMessage(message) {
	if (typeof message !== 'string') {
		return null;
	}
	return message
		.replace(/(?:ExponentPushToken|ExpoPushToken)\[[^\]]+\]/g, '[REDACTED_PUSH_TOKEN]')
		.slice(0, 500);
}

function errorCode(result, fallback) {
	return result?.details?.error ?? result?.code ?? fallback;
}

function isDeviceNotRegistered(result) {
	return errorCode(result) === 'DeviceNotRegistered';
}

function isRetryableRequestError(error) {
	const status = Number(error?.status ?? error?.response?.status);
	if (Number.isFinite(status)) {
		return status === 429 || status >= 500;
	}
	return error?.response === undefined;
}

function nextRetryAt(now, attemptCount, random = Math.random) {
	const delay = RETRY_DELAYS_MS[Math.min(
		attemptCount,
		RETRY_DELAYS_MS.length - 1,
	)];
	const jitter = Math.floor(delay * 0.1 * random());
	return new Date(now.getTime() + delay + jitter);
}

async function retryDelivery(delivery, error, now) {
	await deliveriesRepository.markRetry(
		delivery.id,
		delivery.attemptCount,
		errorCode(error, 'EXPO_REQUEST_FAILED'),
		redactedMessage(error?.message),
		nextRetryAt(now, delivery.attemptCount),
		now,
	);
}

async function sendPending(adapter, options = {}) {
	const now = options.now ?? new Date();
	const deliveries = await deliveriesRepository.claimPending(
		now,
		options.limit ?? 100,
		options.leaseSeconds ?? 60,
	);
	if (deliveries.length === 0) {
		return 0;
	}

	let tickets;
	try {
		tickets = await adapter.send(deliveries.map(delivery => ({
			to: delivery.pushToken,
			title: delivery.title,
			body: delivery.body,
			data: delivery.payload,
		})));
	} catch (error) {
		if (isRetryableRequestError(error)) {
			await Promise.all(deliveries.map(delivery => (
				retryDelivery(delivery, error, now)
			)));
		} else {
			await Promise.all(deliveries.map(delivery => (
				deliveriesRepository.markFailed(
					delivery.id,
					errorCode(error, 'EXPO_REQUEST_REJECTED'),
					redactedMessage(error?.message),
					now,
				)
			)));
		}
		return deliveries.length;
	}

	for (let index = 0; index < deliveries.length; index += 1) {
		const delivery = deliveries[index];
		const ticket = tickets[index];
		if (ticket?.status === 'ok' && ticket.id) {
			await deliveriesRepository.markTicketed(
				delivery.id,
				ticket.id,
				now,
				new Date(now.getTime() + RECEIPT_DELAY_MS),
			);
		} else if (isDeviceNotRegistered(ticket)) {
			await deliveriesRepository.deleteDevice(delivery.deviceId);
			await deliveriesRepository.markFailed(
				delivery.id,
				'DeviceNotRegistered',
				redactedMessage(ticket?.message),
				now,
			);
		} else {
			await deliveriesRepository.markFailed(
				delivery.id,
				errorCode(ticket, 'EXPO_TICKET_REJECTED'),
				redactedMessage(ticket?.message),
				now,
			);
		}
	}
	return deliveries.length;
}

async function checkReceipts(adapter, options = {}) {
	const now = options.now ?? new Date();
	const deliveries = await deliveriesRepository.claimReceipts(
		now,
		options.limit ?? 1000,
		options.leaseSeconds ?? 60,
	);
	if (deliveries.length === 0) {
		return 0;
	}

	let receipts;
	try {
		receipts = await adapter.getReceipts(
			deliveries.map(delivery => delivery.ticketId),
		);
	} catch (error) {
		for (const delivery of deliveries) {
			if (
				now.getTime() - new Date(delivery.ticketedAt).getTime()
				>= RECEIPT_EXPIRY_MS
			) {
				await deliveriesRepository.markFailed(
					delivery.id,
					'EXPO_RECEIPT_EXPIRED',
					null,
					now,
				);
			} else {
				await deliveriesRepository.deferReceipt(
					delivery.id,
					new Date(now.getTime() + RECEIPT_DELAY_MS),
					now,
				);
			}
		}
		return deliveries.length;
	}

	for (const delivery of deliveries) {
		const receipt = receipts[delivery.ticketId];
		if (receipt?.status === 'ok') {
			await deliveriesRepository.markSent(delivery.id, now);
		} else if (receipt?.status === 'error') {
			if (isDeviceNotRegistered(receipt)) {
				await deliveriesRepository.deleteDevice(delivery.deviceId);
			}
			await deliveriesRepository.markFailed(
				delivery.id,
				errorCode(receipt, 'EXPO_RECEIPT_FAILED'),
				redactedMessage(receipt.message),
				now,
			);
		} else if (
			now.getTime() - new Date(delivery.ticketedAt).getTime()
			>= RECEIPT_EXPIRY_MS
		) {
			await deliveriesRepository.markFailed(
				delivery.id,
				'EXPO_RECEIPT_EXPIRED',
				null,
				now,
			);
		} else {
			await deliveriesRepository.deferReceipt(
				delivery.id,
				new Date(now.getTime() + RECEIPT_DELAY_MS),
				now,
			);
		}
	}
	return deliveries.length;
}

module.exports = {
	RECEIPT_DELAY_MS,
	RECEIPT_EXPIRY_MS,
	RETRY_DELAYS_MS,
	redactedMessage,
	isDeviceNotRegistered,
	isRetryableRequestError,
	nextRetryAt,
	sendPending,
	checkReceipts,
};
