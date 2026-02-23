CREATE DATABASE IF NOT EXISTS library_finance_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE library_finance_db;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('administrator', 'staff') NOT NULL DEFAULT 'staff',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS entry_table (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    type ENUM('Income', 'Expenditure') NOT NULL,
    date DATE NOT NULL,
    voucher_number VARCHAR(50) NOT NULL,
    account_head VARCHAR(150) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_voucher_number (voucher_number),
    KEY idx_date (date),
    KEY idx_type_date (type, date),
    KEY idx_account_head (account_head)
) ENGINE=InnoDB;
