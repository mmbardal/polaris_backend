-- +goose Up

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


DROP TABLE IF EXISTS `access_permissions`;
CREATE TABLE `access_permissions`  (
                                       `id` int NOT NULL AUTO_INCREMENT,
                                       `table_serie_id` int NOT NULL,
                                       `user_id` int NOT NULL,
                                       `permission` enum('read','write','both','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
                                       `comment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
                                       `status` enum('notSent','sent','approved','disapproved') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
                                       `send_time` datetime NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                                       PRIMARY KEY (`id`) USING BTREE,
                                       UNIQUE INDEX `table_serie_id`(`table_serie_id` ASC, `user_id` ASC) USING BTREE,
                                       INDEX `table relation`(`table_serie_id` ASC) USING BTREE,
                                       INDEX `user_relation`(`user_id` ASC) USING BTREE,
                                       CONSTRAINT `access_permissions_ibfk_1` FOREIGN KEY (`table_serie_id`) REFERENCES `table_series` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                                       CONSTRAINT `user_relation` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 32 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;


DROP TABLE IF EXISTS `branch_provinces`;
CREATE TABLE `branch_provinces`  (
                                     `id` int UNSIGNED NOT NULL,
                                     `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
                                     PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_520_ci ROW_FORMAT = DYNAMIC;


DROP TABLE IF EXISTS `branch_user`;
CREATE TABLE `branch_user`  (
                                `id` int NOT NULL AUTO_INCREMENT,
                                `user_id` int NOT NULL,
                                `branch_id` int UNSIGNED NOT NULL,
                                PRIMARY KEY (`id`) USING BTREE,
                                INDEX `user_id`(`user_id` ASC) USING BTREE,
                                INDEX `branch_id`(`branch_id` ASC) USING BTREE,
                                CONSTRAINT `branch_user_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                                CONSTRAINT `branch_user_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_ci ROW_FORMAT = Dynamic;


DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches`  (
                             `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
                             `province` int UNSIGNED NOT NULL,
                             `branch` int UNSIGNED NOT NULL,
                             `group` int NULL DEFAULT NULL,
                             `college` int UNSIGNED NULL DEFAULT NULL,
                             `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
                             PRIMARY KEY (`id`) USING BTREE,
                             INDEX `province`(`province` ASC) USING BTREE,
                             INDEX `group`(`group` ASC) USING BTREE,
                             CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`province`) REFERENCES `branch_provinces` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                             CONSTRAINT `branches_ibfk_2` FOREIGN KEY (`group`) REFERENCES `groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 434 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_520_ci ROW_FORMAT = DYNAMIC;


DROP TABLE IF EXISTS `group_user`;
CREATE TABLE `group_user`  (
                               `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
                               `user_id` int NOT NULL,
                               `group_id` int NOT NULL,
                               PRIMARY KEY (`id`) USING BTREE,
                               INDEX `user_id`(`user_id` ASC) USING BTREE,
                               INDEX `group_id`(`group_id` ASC) USING BTREE,
                               CONSTRAINT `group_user_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                               CONSTRAINT `group_user_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_ci ROW_FORMAT = Dynamic;


DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups`  (
                           `id` int NOT NULL AUTO_INCREMENT,
                           `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
                           PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_ci ROW_FORMAT = Dynamic;

DROP TABLE IF EXISTS `table_data`;
CREATE TABLE `table_data`  (
                               `id` bigint NOT NULL AUTO_INCREMENT,
                               `table_id` int NOT NULL,
                               `data` json NOT NULL,
                               `branch` int UNSIGNED NOT NULL,
                               `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                               PRIMARY KEY (`id`) USING BTREE,
                               INDEX `branch`(`branch` ASC) USING BTREE,
                               INDEX `table_data_ibfk_1`(`table_id` ASC) USING BTREE,
                               CONSTRAINT `table_data_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `table_series` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                               CONSTRAINT `table_data_ibfk_2` FOREIGN KEY (`branch`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_ci ROW_FORMAT = Dynamic;


DROP TABLE IF EXISTS `table_definition`;
CREATE TABLE `table_definition`  (
                                     `id` int NOT NULL AUTO_INCREMENT,
                                     `old` json NOT NULL,
                                     `columns_properties` json NOT NULL,
                                     `table_title_id` int NOT NULL,
                                     PRIMARY KEY (`id`) USING BTREE,
                                     INDEX `table_title_id`(`table_title_id` ASC) USING BTREE,
                                     CONSTRAINT `table_definition_ibfk_1` FOREIGN KEY (`table_title_id`) REFERENCES `table_title` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;


DROP TABLE IF EXISTS `table_series`;
CREATE TABLE `table_series`  (
                                 `id` int NOT NULL AUTO_INCREMENT,
                                 `serial_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
                                 `deadline` date NOT NULL,
                                 `table_definition_id` int NOT NULL,
                                 `approval_level` int NOT NULL,
                                 `previous_approval_level` int NOT NULL,
                                 `emp_id` int NOT NULL,
                                 `manager_id` int NOT NULL,
                                 `deputy_id` int NOT NULL,
                                 `boss_id` int NOT NULL,
                                 `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 `modified` datetime NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                                 `change_lock` tinyint NOT NULL,
                                 `write_permission` tinyint NOT NULL,
                                 PRIMARY KEY (`id`) USING BTREE,
                                 UNIQUE INDEX `serial`(`serial_number` ASC) USING BTREE,
                                 INDEX `table_id`(`table_definition_id` ASC) USING BTREE,
                                 INDEX `emp_id`(`emp_id` ASC) USING BTREE,
                                 INDEX `manager_id`(`manager_id` ASC) USING BTREE,
                                 INDEX `deputy_id`(`deputy_id` ASC) USING BTREE,
                                 INDEX `boss_id`(`boss_id` ASC) USING BTREE,
                                 CONSTRAINT `table_series_ibfk_1` FOREIGN KEY (`table_definition_id`) REFERENCES `table_definition` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                                 CONSTRAINT `table_series_ibfk_2` FOREIGN KEY (`emp_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                                 CONSTRAINT `table_series_ibfk_3` FOREIGN KEY (`manager_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                                 CONSTRAINT `table_series_ibfk_4` FOREIGN KEY (`deputy_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
                                 CONSTRAINT `table_series_ibfk_5` FOREIGN KEY (`boss_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_ci ROW_FORMAT = Dynamic;


DROP TABLE IF EXISTS `table_title`;
CREATE TABLE `table_title`  (
                                `id` int NOT NULL AUTO_INCREMENT,
                                `table_title_FA` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
                                PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_ci ROW_FORMAT = Dynamic;


DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
                         `id` int NOT NULL AUTO_INCREMENT,
                         `last_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
                         `first_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
                         `mobileNumber` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
                         `role` enum('boss','manager','deputy','supervisor','user','expert') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
                         `parent_id` int NOT NULL DEFAULT 0,
                         `SU` tinyint(1) NOT NULL DEFAULT 0,
                         `active` tinyint(1) NOT NULL DEFAULT 1,
                         `ST` tinyint(1) NOT NULL DEFAULT 0,
                         `createGroup` tinyint(1) NOT NULL DEFAULT 0,
                         `AU` tinyint(1) NOT NULL DEFAULT 0,
                         `changeReadAccess` tinyint(1) NOT NULL DEFAULT 0,
                         `CP` tinyint(1) NOT NULL DEFAULT 0,
                         `GE` tinyint(1) NOT NULL DEFAULT 0,
                         `positionName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
                         PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;

CREATE EVENT IF NOT EXISTS expire_write_permission
ON SCHEDULE EVERY 1 DAY
DO
UPDATE table_series
SET write_permission = 0
WHERE deadline < CURDATE() AND write_permission = 1;


-- +goose Down
