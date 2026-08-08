const env = require('../../config/env');

class ExpoPushAdapter {
	constructor(options = {}) {
		this.client = options.client;
		this.accessToken = options.accessToken ?? env.EXPO_ACCESS_TOKEN;
	}

	async getClient() {
		if (!this.client) {
			const { Expo } = await import('expo-server-sdk');
			this.client = new Expo({ accessToken: this.accessToken });
		}
		return this.client;
	}

	async send(messages) {
		const client = await this.getClient();
		const results = [];
		for (const chunk of client.chunkPushNotifications(messages)) {
			const tickets = await client.sendPushNotificationsAsync(chunk);
			results.push(...tickets);
		}
		return results;
	}

	async getReceipts(ticketIds) {
		const client = await this.getClient();
		const receipts = {};
		for (const chunk of client.chunkPushNotificationReceiptIds(ticketIds)) {
			Object.assign(
				receipts,
				await client.getPushNotificationReceiptsAsync(chunk),
			);
		}
		return receipts;
	}
}

module.exports = { ExpoPushAdapter };
