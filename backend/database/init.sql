CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    passwordHash NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'user',
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name NVARCHAR(100) NULL,
    birth_date DATE NULL,
    gender NVARCHAR(20) NULL,
    height_cm DECIMAL(5,2) NULL,
    weight_kg DECIMAL(5,2) NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Profiles_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Goals (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    goal_type NVARCHAR(50) NOT NULL,
    title NVARCHAR(255) NULL,
    target_value DECIMAL(10,2) NULL,
    unit NVARCHAR(20) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Goals_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE DailyTracking (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    tracking_date DATE NOT NULL,
    steps INT NULL DEFAULT 0,
    calories INT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_DailyTracking_User_Date UNIQUE (user_id, tracking_date),
    CONSTRAINT FK_DailyTracking_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Favorites (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    water BIT NOT NULL DEFAULT 1,
    weight BIT NOT NULL DEFAULT 1,
    height BIT NOT NULL DEFAULT 1,
    bmi BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Favorites_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE MoodEntries (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    mood_date DATE NOT NULL,
    mood_score INT NULL,
    mood_label NVARCHAR(50) NULL,
    mood_emoji NVARCHAR(10) NULL,
    note NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_MoodEntries_User_Date UNIQUE (user_id, mood_date),
    CONSTRAINT FK_MoodEntries_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE SleepEntries (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    sleep_date DATE NOT NULL,
    started_at NVARCHAR(10) NULL,
    ended_at NVARCHAR(10) NULL,
    duration_hours INT NULL,
    duration_minutes INT NULL,
    quality NVARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_SleepEntries_User_Date UNIQUE (user_id, sleep_date),
    CONSTRAINT FK_SleepEntries_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE WaterEntries (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    amount_ml INT NOT NULL,
    recorded_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_WaterEntries_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
