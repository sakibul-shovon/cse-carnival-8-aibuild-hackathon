IF DB_ID(N'CampusOS') IS NULL
BEGIN
    CREATE DATABASE CampusOS;
END;
GO

USE CampusOS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        id              VARCHAR(50)    NOT NULL,
        name            NVARCHAR(150)  NOT NULL,
        email           VARCHAR(254)   NOT NULL,
        student_id      VARCHAR(50)    NULL,
        password_hash   VARCHAR(255)   NOT NULL,
        role            VARCHAR(20)    NOT NULL,
        created_at      DATETIME2(0)   NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Users PRIMARY KEY (id),
        CONSTRAINT UQ_Users_Email UNIQUE (email),
        CONSTRAINT UQ_Users_StudentId UNIQUE (student_id),
        CONSTRAINT CK_Users_Role CHECK (role IN ('student', 'admin'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_Role' AND object_id = OBJECT_ID(N'dbo.Users'))
    CREATE INDEX IX_Users_Role ON dbo.Users (role);
GO

IF OBJECT_ID(N'dbo.Rooms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Rooms
    (
        id              VARCHAR(50)   NOT NULL,
        room_number     VARCHAR(20)   NOT NULL,
        [type]          VARCHAR(30)   NOT NULL,
        capacity        INT           NOT NULL,
        floor           TINYINT       NOT NULL,
        [status]        VARCHAR(20)   NOT NULL CONSTRAINT DF_Rooms_Status DEFAULT ('available'),
        CONSTRAINT PK_Rooms PRIMARY KEY (id),
        CONSTRAINT UQ_Rooms_RoomNumber UNIQUE (room_number),
        CONSTRAINT CK_Rooms_Capacity CHECK (capacity > 0),
        CONSTRAINT CK_Rooms_Floor CHECK (floor > 0),
        CONSTRAINT CK_Rooms_Type CHECK ([type] IN ('classroom', 'lab', 'seminar hall', 'seminar')),
        CONSTRAINT CK_Rooms_Status CHECK ([status] IN ('available', 'booked', 'maintenance', 'unavailable'))
    );
END;
GO

IF OBJECT_ID(N'dbo.RoomEquipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RoomEquipment
    (
        room_id         VARCHAR(50) NOT NULL,
        equipment       VARCHAR(100) NOT NULL,
        CONSTRAINT PK_RoomEquipment PRIMARY KEY (room_id, equipment),
        CONSTRAINT FK_RoomEquipment_Rooms FOREIGN KEY (room_id)
            REFERENCES dbo.Rooms (id) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID(N'dbo.RoomBookings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RoomBookings
    (
        booking_id      VARCHAR(50)  NOT NULL,
        room_id         VARCHAR(50)  NOT NULL,
        booked_by       NVARCHAR(150) NOT NULL,
        [date]          DATE         NOT NULL,
        start_time      TIME(0)      NOT NULL,
        end_time        TIME(0)      NOT NULL,
        purpose         NVARCHAR(250) NOT NULL,
        CONSTRAINT PK_RoomBookings PRIMARY KEY (booking_id),
        CONSTRAINT FK_RoomBookings_Rooms FOREIGN KEY (room_id)
            REFERENCES dbo.Rooms (id) ON DELETE CASCADE,
        CONSTRAINT CK_RoomBookings_TimeRange CHECK (end_time > start_time)
    );
END;
GO

IF OBJECT_ID(N'dbo.Schedules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Schedules
    (
        id              VARCHAR(50)   NOT NULL,
        course          VARCHAR(30)   NOT NULL,
        title           NVARCHAR(200) NOT NULL,
        day             VARCHAR(15)   NOT NULL,
        start_time      TIME(0)       NOT NULL,
        end_time        TIME(0)       NOT NULL,
        room            VARCHAR(20)   NOT NULL,
        instructor      NVARCHAR(150) NOT NULL,
        section         VARCHAR(30)   NOT NULL,
        CONSTRAINT PK_Schedules PRIMARY KEY (id),
        CONSTRAINT FK_Schedules_Rooms FOREIGN KEY (room)
            REFERENCES dbo.Rooms (room_number),
        CONSTRAINT CK_Schedules_Day CHECK (day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday')),
        CONSTRAINT CK_Schedules_TimeRange CHECK (end_time > start_time)
    );
END;
GO

IF OBJECT_ID(N'dbo.Events', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Events
    (
        id              VARCHAR(50)   NOT NULL,
        name            NVARCHAR(200) NOT NULL,
        description     NVARCHAR(MAX) NOT NULL,
        [date]          DATE          NOT NULL,
        start_time      TIME(0)       NOT NULL,
        end_time        TIME(0)       NOT NULL,
        end_date        DATE          NOT NULL,
        venue           VARCHAR(20)   NOT NULL,
        organizer       NVARCHAR(150) NOT NULL,
        capacity        INT           NOT NULL,
        registered      INT           NOT NULL CONSTRAINT DF_Events_Registered DEFAULT (0),
        [status]        VARCHAR(20)   NOT NULL CONSTRAINT DF_Events_Status DEFAULT ('upcoming'),
        CONSTRAINT PK_Events PRIMARY KEY (id),
        CONSTRAINT FK_Events_Rooms FOREIGN KEY (venue)
            REFERENCES dbo.Rooms (room_number),
        CONSTRAINT CK_Events_Dates CHECK (end_date >= [date]),
        CONSTRAINT CK_Events_TimeRange CHECK (end_time > start_time OR end_date > [date]),
        CONSTRAINT CK_Events_Capacity CHECK (capacity > 0),
        CONSTRAINT CK_Events_Registered CHECK (registered >= 0 AND registered <= capacity),
        CONSTRAINT CK_Events_Status CHECK ([status] IN ('upcoming', 'ongoing', 'completed', 'cancelled', 'full'))
    );
END;
GO

IF OBJECT_ID(N'dbo.EventRegistrations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EventRegistrations
    (
        student_id      VARCHAR(50)   NOT NULL,
        event_id        VARCHAR(50)   NOT NULL,
        name            NVARCHAR(150) NOT NULL,
        CONSTRAINT PK_EventRegistrations PRIMARY KEY (student_id, event_id),
        CONSTRAINT FK_EventRegistrations_Events FOREIGN KEY (event_id)
            REFERENCES dbo.Events (id) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID(N'dbo.Announcements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Announcements
    (
        id              VARCHAR(50)   NOT NULL,
        title           NVARCHAR(200) NOT NULL,
        body            NVARCHAR(MAX) NOT NULL,
        [date]          DATE          NOT NULL,
        priority        VARCHAR(10)   NOT NULL,
        posted_by       NVARCHAR(150) NOT NULL,
        expires         DATE          NOT NULL,
        CONSTRAINT PK_Announcements PRIMARY KEY (id),
        CONSTRAINT CK_Announcements_Priority CHECK (priority IN ('high', 'medium', 'low')),
        CONSTRAINT CK_Announcements_Dates CHECK (expires >= [date])
    );
END;
GO

IF OBJECT_ID(N'dbo.Assignments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Assignments
    (
        id                  VARCHAR(50)   NOT NULL,
        course              VARCHAR(30)   NOT NULL,
        course_title        NVARCHAR(200) NOT NULL,
        title               NVARCHAR(250) NOT NULL,
        description         NVARCHAR(MAX) NOT NULL,
        assigned_date       DATE          NOT NULL,
        deadline            DATE          NOT NULL,
        submission_platform NVARCHAR(150) NOT NULL,
        [status]            VARCHAR(15)   NOT NULL,
        marks               INT           NOT NULL,
        CONSTRAINT PK_Assignments PRIMARY KEY (id),
        CONSTRAINT CK_Assignments_Dates CHECK (deadline >= assigned_date),
        CONSTRAINT CK_Assignments_Status CHECK ([status] IN ('pending', 'submitted', 'graded', 'late')),
        CONSTRAINT CK_Assignments_Marks CHECK (marks >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Schedules_Day' AND object_id = OBJECT_ID(N'dbo.Schedules'))
    CREATE INDEX IX_Schedules_Day ON dbo.Schedules (day, start_time);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Schedules_Room' AND object_id = OBJECT_ID(N'dbo.Schedules'))
    CREATE INDEX IX_Schedules_Room ON dbo.Schedules (room);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RoomBookings_RoomDate' AND object_id = OBJECT_ID(N'dbo.RoomBookings'))
    CREATE INDEX IX_RoomBookings_RoomDate ON dbo.RoomBookings (room_id, [date], start_time);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Events_DateStatus' AND object_id = OBJECT_ID(N'dbo.Events'))
    CREATE INDEX IX_Events_DateStatus ON dbo.Events ([date], [status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EventRegistrations_Event' AND object_id = OBJECT_ID(N'dbo.EventRegistrations'))
    CREATE INDEX IX_EventRegistrations_Event ON dbo.EventRegistrations (event_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Announcements_DatePriority' AND object_id = OBJECT_ID(N'dbo.Announcements'))
    CREATE INDEX IX_Announcements_DatePriority ON dbo.Announcements ([date] DESC, priority);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Assignments_DeadlineStatus' AND object_id = OBJECT_ID(N'dbo.Assignments'))
    CREATE INDEX IX_Assignments_DeadlineStatus ON dbo.Assignments (deadline, [status]);
GO
