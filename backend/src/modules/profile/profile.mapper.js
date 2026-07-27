function toDateString(value) {
	return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toDateTimeString(value) {
	return value instanceof Date ? value.toISOString() : value;
}

function calculateAge(birthDate) {
	if (!birthDate) {
		return null;
	}

	const normalizedBirthDate = new Date(`${toDateString(birthDate)}T00:00:00.000Z`);
	const today = new Date();
	let age = today.getUTCFullYear() - normalizedBirthDate.getUTCFullYear();
	const monthDifference = today.getUTCMonth() - normalizedBirthDate.getUTCMonth();

	if (
		monthDifference < 0
		|| (
			monthDifference === 0
			&& today.getUTCDate() < normalizedBirthDate.getUTCDate()
		)
	) {
		age -= 1;
	}

	return Math.max(age, 0);
}

function calculateBmi(weightKg, heightCm) {
	if (weightKg === null || heightCm === null) {
		return null;
	}

	const heightMeters = heightCm / 100;
	return Number((weightKg / (heightMeters ** 2)).toFixed(2));
}

function toProfileDto(profile) {
	const heightCm = profile.heightCm === null
		? null
		: Number(profile.heightCm);
	const weightKg = profile.weightKg === null
		? null
		: Number(profile.weightKg);
	const birthDate = profile.birthDate === null
		? null
		: toDateString(profile.birthDate);

	return {
		userId: Number(profile.userId),
		email: profile.email,
		firstName: profile.firstName ?? null,
		birthDate,
		age: calculateAge(birthDate),
		gender: profile.gender ?? null,
		heightCm,
		weightKg,
		bmi: calculateBmi(weightKg, heightCm),
		updatedAt: toDateTimeString(profile.updatedAt),
	};
}

module.exports = { toProfileDto };
