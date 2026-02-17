ALTER TABLE `budget_assumptions` ADD `initiative_id` INT NULL DEFAULT NULL AFTER `phase_id`;

UPDATE budget_assumptions ba
JOIN result r 
    ON ba.item_id = r.result_uuid
SET ba.initiative_id = r.initiative_id
WHERE ba.initiative_id IS NULL;

ALTER TABLE `budget_assumptions` ADD FOREIGN KEY (`initiative_id`) REFERENCES `initiative`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;


INSERT INTO `organization` (`code`, `name`, `acronym`, `disabled`) VALUES ('999999', 'Unknown Center', 'Unknown Center', '0');


DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1714;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1720;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1721;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1722;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1723;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1724;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1725;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 1726;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 2051;
DELETE FROM `anaplan_values` WHERE `anaplan_values`.`id` = 2052;

CREATE TABLE IF NOT EXISTS `porb_aow` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `toc_id` CHAR(36) NOT NULL,
  `aow_name` VARCHAR(255) NOT NULL,
  `aow_acrnum` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_aow_program_id` (`program_id`),
  INDEX `idx_porb_aow_toc_id` (`toc_id`),
  CONSTRAINT `fk_porb_aow_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `porb_hlo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `porb_aow_id` INT NULL,
  `toc_id` CHAR(36) NOT NULL,
  `center_id` INT NOT NULL,
  `hlo_name` VARCHAR(255) NOT NULL,
  `hlo_description` MEDIUMTEXT NULL,
  `hlo_type` VARCHAR(255) NULL,
  `hlo_geo` MEDIUMTEXT NULL,
  `hlo_target` INT NULL,
  `hlo_budget` FLOAT NULL,
  `hlo_assumption` MEDIUMTEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_hlo_program_id` (`program_id`),
  INDEX `idx_porb_hlo_porb_aow_id` (`porb_aow_id`),
  INDEX `idx_porb_hlo_toc_id` (`toc_id`),
  INDEX `idx_porb_hlo_center_id` (`center_id`),
  CONSTRAINT `fk_porb_hlo_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_hlo_center_id`
    FOREIGN KEY (`center_id`)
    REFERENCES `organization` (`code`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_hlo_porb_aow_id`
    FOREIGN KEY (`porb_aow_id`)
    REFERENCES `porb_aow` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `porb_partner` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `porb_aow_id` INT NULL,
  `toc_id` CHAR(36) NOT NULL,
  `partner_name` VARCHAR(255) NOT NULL,
  `partner_outputs` MEDIUMTEXT NULL,
  `partner_geo` MEDIUMTEXT NULL,
  `partner_budget` FLOAT NULL,
  `partner_assumption` MEDIUMTEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_partner_program_id` (`program_id`),
  INDEX `idx_porb_partner_porb_aow_id` (`porb_aow_id`),
  INDEX `idx_porb_partner_toc_id` (`toc_id`),
  CONSTRAINT `fk_porb_partner_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_partner_porb_aow_id`
    FOREIGN KEY (`porb_aow_id`)
    REFERENCES `porb_aow` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `porb_bilateral` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `porb_aow_id` INT NULL,
  `toc_id` CHAR(36) NOT NULL,
  `center_id` INT NOT NULL,
  `bilateral_name` VARCHAR(255) NOT NULL,
  `bilateral_outputs` MEDIUMTEXT NULL,
  `bilateral_budget` FLOAT NULL,
  `bilateral_assumption` MEDIUMTEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_bilateral_program_id` (`program_id`),
  INDEX `idx_porb_bilateral_porb_aow_id` (`porb_aow_id`),
  INDEX `idx_porb_bilateral_toc_id` (`toc_id`),
  INDEX `idx_porb_bilateral_center_id` (`center_id`),
  CONSTRAINT `fk_porb_bilateral_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_bilateral_center_id`
    FOREIGN KEY (`center_id`)
    REFERENCES `organization` (`code`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_bilateral_porb_aow_id`
    FOREIGN KEY (`porb_aow_id`)
    REFERENCES `porb_aow` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `porb_melia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `porb_aow_id` INT NULL,
  `toc_id` CHAR(36) NOT NULL,
  `center_id` INT NOT NULL,
  `melia_name` VARCHAR(255) NOT NULL,
  `melia_outputs` MEDIUMTEXT NULL,
  `melia_budget` FLOAT NULL,
  `melia_assumption` MEDIUMTEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_melia_program_id` (`program_id`),
  INDEX `idx_porb_melia_porb_aow_id` (`porb_aow_id`),
  INDEX `idx_porb_melia_toc_id` (`toc_id`),
  INDEX `idx_porb_melia_center_id` (`center_id`),
  CONSTRAINT `fk_porb_melia_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_melia_center_id`
    FOREIGN KEY (`center_id`)
    REFERENCES `organization` (`code`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_melia_porb_aow_id`
    FOREIGN KEY (`porb_aow_id`)
    REFERENCES `porb_aow` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

ALTER TABLE `porb_hlo`
  ADD COLUMN IF NOT EXISTS `porb_aow_id` INT NULL AFTER `program_id`;

ALTER TABLE `porb_partner`
  ADD COLUMN IF NOT EXISTS `porb_aow_id` INT NULL AFTER `program_id`;

ALTER TABLE `porb_bilateral`
  ADD COLUMN IF NOT EXISTS `porb_aow_id` INT NULL AFTER `program_id`;

ALTER TABLE `porb_melia`
  ADD COLUMN IF NOT EXISTS `porb_aow_id` INT NULL AFTER `program_id`;

CREATE TABLE IF NOT EXISTS `porb_contracted_partners` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `center_id` INT NOT NULL,
  `porb_partner_id` INT NOT NULL,
  `countries` MEDIUMTEXT NOT NULL,
  `budget` FLOAT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_contracted_partners_program_id` (`program_id`),
  INDEX `idx_porb_contracted_partners_center_id` (`center_id`),
  INDEX `idx_porb_contracted_partners_partner_id` (`porb_partner_id`),
  CONSTRAINT `fk_porb_contracted_partners_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_contracted_partners_center_id`
    FOREIGN KEY (`center_id`)
    REFERENCES `organization` (`code`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_contracted_partners_partner_id`
    FOREIGN KEY (`porb_partner_id`)
    REFERENCES `porb_partner` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

ALTER TABLE `porb_contracted_partners`
  ADD COLUMN IF NOT EXISTS `center_id` INT NULL AFTER `program_id`;

UPDATE `porb_contracted_partners` c
JOIN `porb_partner` p ON p.id = c.porb_partner_id
SET c.center_id = p.center_id
WHERE c.center_id IS NULL;

ALTER TABLE `porb_partner`
  DROP FOREIGN KEY `fk_porb_partner_center_id`;

ALTER TABLE `porb_partner`
  DROP INDEX `idx_porb_partner_center_id`;

ALTER TABLE `porb_partner`
  DROP COLUMN `center_id`;

ALTER TABLE `porb_partner`
  DROP COLUMN `partner_is_contracted`;

CREATE TABLE IF NOT EXISTS `porb_anaplan` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `porb_aow_id` INT NOT NULL,
  `center_id` INT NOT NULL,
  `anaplan_id` INT NOT NULL,
  `budget` FLOAT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_porb_anaplan_program_id` (`program_id`),
  INDEX `idx_porb_anaplan_porb_aow_id` (`porb_aow_id`),
  INDEX `idx_porb_anaplan_center_id` (`center_id`),
  INDEX `idx_porb_anaplan_anaplan_id` (`anaplan_id`),
  CONSTRAINT `fk_porb_anaplan_program_id`
    FOREIGN KEY (`program_id`)
    REFERENCES `initiative` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_anaplan_porb_aow_id`
    FOREIGN KEY (`porb_aow_id`)
    REFERENCES `porb_aow` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_anaplan_center_id`
    FOREIGN KEY (`center_id`)
    REFERENCES `organization` (`code`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_porb_anaplan_anaplan_id`
    FOREIGN KEY (`anaplan_id`)
    REFERENCES `anaplan` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
