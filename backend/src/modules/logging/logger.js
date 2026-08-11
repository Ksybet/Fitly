const logRepository = require('./log.repository');

const LOG_LEVELS = new Set(['info', 'warning', 'error', 'critical']);
const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
	/(?:password|authorization|cookie|token|secret|api[_-]?key|database[_-]?url|connection[_-]?string)/i;
const MAX_METADATA_DEPTH = 5;
const MAX_METADATA_ARRAY_ITEMS = 50;

function truncate(value, maximum) {
	return value.length <= maximum ? value : value.slice(0, maximum);
}

function sanitizeString(value) {
	return value
		.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
		.replace(
			/((?:password(?:_hash)?|authorization|cookie|refresh[_-]?token|access[_-]?token|api[_-]?key|database[_-]?url|secret)\s*[:=]\s*)[^\s,;]+/gi,
			'$1[REDACTED]',
		)
		.replace(
			/((?:postgres(?:ql)?):\/\/[^:\s/]+:)[^@\s/]+(@)/gi,
			'$1[REDACTED]$2',
		)
		.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED);
}

function sanitizeValue(value, depth = 0, seen = new WeakSet()) {
	if (typeof value === 'string') return sanitizeString(value);
	if (
		value === null
		|| value === undefined
		|| typeof value === 'number'
		|| typeof value === 'boolean'
	) {
		return value;
	}
	if (typeof value === 'bigint') return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (depth >= MAX_METADATA_DEPTH) return '[TRUNCATED]';
	if (typeof value !== 'object') return String(value);
	if (seen.has(value)) return '[CIRCULAR]';

	seen.add(value);
	if (Array.isArray(value)) {
		const sanitized = value
			.slice(0, MAX_METADATA_ARRAY_ITEMS)
			.map(item => sanitizeValue(item, depth + 1, seen));
		seen.delete(value);
		return sanitized;
	}

	const sanitized = {};
	for (const [key, item] of Object.entries(value)) {
		sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
			? REDACTED
			: sanitizeValue(item, depth + 1, seen);
	}
	seen.delete(value);
	return sanitized;
}

function normalizeEntry(level, message, context = {}) {
	if (!LOG_LEVELS.has(level)) {
		throw new TypeError(`Unsupported log level: ${level}`);
	}

	const normalizedMessage = truncate(
		sanitizeString(String(message || 'Unknown application event').trim()),
		2000,
	);
	const {
		service = 'application',
		userId,
		requestId,
		error,
		metadata,
		...additionalMetadata
	} = context || {};
	const rawStackTrace = error instanceof Error
		? error.stack || `${error.name}: ${error.message}`
		: typeof context.stackTrace === 'string'
			? context.stackTrace
			: null;
	delete additionalMetadata.stackTrace;

	return {
		timestamp: new Date().toISOString(),
		level,
		service: truncate(sanitizeString(String(service).trim() || 'application'), 100),
		userId: Number.isInteger(userId) && userId > 0 ? userId : null,
		message: normalizedMessage,
		stackTrace: rawStackTrace
			? truncate(sanitizeString(rawStackTrace), 20000)
			: null,
		requestId: typeof requestId === 'string' && requestId.trim()
			? truncate(sanitizeString(requestId.trim()), 100)
			: null,
		metadata: sanitizeValue({
			...(metadata && typeof metadata === 'object' ? metadata : {}),
			...additionalMetadata,
		}),
	};
}

function writeToConsole(entry) {
	const serialized = JSON.stringify(entry);
	if (entry.level === 'info') {
		console.log(serialized);
	} else if (entry.level === 'warning') {
		console.warn(serialized);
	} else {
		console.error(serialized);
	}
}

async function log(level, message, context = {}) {
	let entry;
	try {
		entry = normalizeEntry(level, message, context);
	} catch (error) {
		console.error(JSON.stringify({
			timestamp: new Date().toISOString(),
			level: 'error',
			service: 'logging',
			message: 'Failed to normalize system log',
			stackTrace: sanitizeString(error.stack || error.message),
		}));
		return null;
	}

	writeToConsole(entry);
	try {
		await logRepository.createLog(entry);
	} catch (error) {
		console.error(JSON.stringify({
			timestamp: new Date().toISOString(),
			level: 'error',
			service: 'logging',
			message: 'Failed to persist system log',
			requestId: entry.requestId,
			stackTrace: sanitizeString(error.stack || error.message),
		}));
	}

	return entry;
}

module.exports = {
	LOG_LEVELS,
	REDACTED,
	normalizeEntry,
	sanitizeValue,
	info: (message, context) => log('info', message, context),
	warning: (message, context) => log('warning', message, context),
	error: (message, context) => log('error', message, context),
	critical: (message, context) => log('critical', message, context),
};
