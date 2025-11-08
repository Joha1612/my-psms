CREATE DATABASE IF NOT EXISTS psm;
USE psm;

CREATE TABLE IF NOT EXISTS salaryrecords (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  `Date` DATE,
  `Year` VARCHAR(10),
  `Month` VARCHAR(32),
  `Payment type` VARCHAR(60),
  `Salary Amount` DECIMAL(12,2) DEFAULT 0,
  `Amount payable` DECIMAL(12,2) DEFAULT 0,
  `Monthly due` DECIMAL(12,2) DEFAULT 0,
  `Total due` DECIMAL(14,2) DEFAULT 0,
  `Comment` TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_month_year ON salaryrecords(`Month`, `Year`);
