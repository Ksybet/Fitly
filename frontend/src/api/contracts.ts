export type RequestId = string;

export type FieldError = {
	field?: string;
	code?: string;
	message: string;
};

export type ResponseMeta = {
	requestId?: RequestId;
};

export type SuccessEnvelope<T> = {
	success: true;
	data: T;
	meta?: ResponseMeta;
};

export type ErrorEnvelope = {
	success: false;
	message: string;
	error: {
		code: string;
		requestId: RequestId;
		details?: FieldError[];
	};
};

export type User = {
	id: number;
	email: string;
	role: 'user' | 'admin';
	status: 'active' | 'blocked' | 'deleted';
	emailVerified: boolean;
	appVersion: string | null;
	createdAt: string;
};

export type AuthTokens = {
	token: string;
	refreshToken: string;
	tokenType: 'Bearer';
	expiresIn: number;
};

export type AuthData = AuthTokens & {
	user: User;
};

export type StoredAuthSession = AuthTokens & {
	expiresAt: number;
	user: User;
};

export type Profile = {
	userId: number;
	email: string;
	firstName: string | null;
	birthDate: string | null;
	age: number | null;
	gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
	heightCm: number | null;
	weightKg: number | null;
	bmi: number | null;
	updatedAt: string;
};

export type UpdateProfileRequest = Partial<
	Pick<Profile, 'firstName' | 'birthDate' | 'gender' | 'heightCm' | 'weightKg'>
>;

export type GoalType =
	| 'weight_loss'
	| 'weight_gain'
	| 'maintain_shape'
	| 'steps'
	| 'water'
	| 'custom';

export type GoalUnit =
	| 'kg'
	| 'steps'
	| 'ml'
	| 'workouts'
	| 'minutes'
	| 'repetitions'
	| 'custom';

export type GoalStatus =
	| 'created'
	| 'in_progress'
	| 'completed'
	| 'cancelled';

export type GoalInput = {
	goalType: GoalType;
	title: string;
	targetValue: number;
	unit: GoalUnit;
	startsOn?: string;
	endsOn?: string | null;
};

export type Goal = GoalInput & {
	id: number;
	status: GoalStatus;
	currentValue: number | null;
	progressPercent: number;
	createdAt: string;
	completedAt: string | null;
};

export type WaterDay = {
	date: string;
	amountMl: number;
	goalMl: number;
	progressPercent: number;
};

export type SleepTodayRequest = {
	sleepStart: string;
	sleepEnd: string;
	sleepQuality: number;
};

export type SleepEntry = SleepTodayRequest & {
	id: number;
	date: string;
	durationMinutes: number;
	createdAt: string;
	updatedAt: string;
};

export type MoodTodayRequest = {
	moodScore: number;
	moodLabel?: string;
	moodEmoji?: string;
	note?: string;
};

export type MoodEntry = MoodTodayRequest & {
	id: number;
	date: string;
	createdAt: string;
	updatedAt: string;
};

export type Favorites = {
	water: boolean;
	weight: boolean;
	height: boolean;
	bmi: boolean;
};

export type DailyTracking = {
	date: string;
	steps: number;
	calories: number;
};

export type DailyTrackingRequest = Partial<
	Pick<DailyTracking, 'steps' | 'calories'>
>;

export type ActionResult = {
	completed: true;
};

export type WorkoutType = 'cardio' | 'strength' | 'stretching' | 'yoga';

export type BodyArea =
	| 'abs'
	| 'legs'
	| 'back'
	| 'arms'
	| 'glutes'
	| 'full_body';

export type Intensity = 'low' | 'medium' | 'high';

export type WorkoutSummary = {
	id: number;
	title: string;
	description?: string;
	type: WorkoutType;
	bodyArea: BodyArea;
	intensity: Intensity;
	durationMinutes: number;
	estimatedCalories: number;
	imageUrl?: string | null;
	isActive: boolean;
};

export type MediaResource = {
	type: 'image' | 'video';
	url: string;
	title?: string;
};

export type Exercise = {
	id: number;
	title: string;
	description: string;
	type: WorkoutType;
	bodyArea: BodyArea;
	intensity: Intensity;
	instructions: string[];
	media?: MediaResource[];
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type WorkoutExercise = {
	exerciseId: number;
	order: number;
	sets?: number;
	repetitions?: number;
	durationSeconds?: number;
	restSeconds?: number;
	exercise: Exercise;
};

export type Workout = WorkoutSummary & {
	exercises: WorkoutExercise[];
	createdAt: string;
	updatedAt: string;
};

export type PaginationMeta = ResponseMeta & {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

export type PaginatedEnvelope<T> = {
	success: true;
	data: T[];
	meta: PaginationMeta;
};
