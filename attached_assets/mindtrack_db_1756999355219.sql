-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 22, 2025 at 01:54 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mindtrack_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `dass21_results`
--

CREATE TABLE `dass21_results` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `depression_score` int(11) NOT NULL,
  `anxiety_score` int(11) NOT NULL,
  `stress_score` int(11) NOT NULL,
  `depression_severity` varchar(50) NOT NULL,
  `anxiety_severity` varchar(50) NOT NULL,
  `stress_severity` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dass21_results`
--

INSERT INTO `dass21_results` (`id`, `user_id`, `depression_score`, `anxiety_score`, `stress_score`, `depression_severity`, `anxiety_severity`, `stress_severity`, `created_at`) VALUES
(1, 12, 28, 2, 18, 'Extremely Severe', 'Normal', 'Mild', '2025-07-30 11:50:25'),
(2, 12, 28, 2, 18, 'Extremely Severe', 'Normal', 'Mild', '2025-07-30 11:50:41'),
(3, 12, 28, 2, 18, 'Extremely Severe', 'Normal', 'Mild', '2025-07-30 11:51:18'),
(4, 12, 16, 8, 16, 'Moderate', 'Mild', 'Mild', '2025-08-22 03:54:03');

-- --------------------------------------------------------

--
-- Table structure for table `mood_logs`
--

CREATE TABLE `mood_logs` (
  `log_id` int(11) NOT NULL,
  `id` int(11) NOT NULL,
  `emotion` varchar(50) NOT NULL,
  `sleep` float NOT NULL,
  `energy` int(11) NOT NULL,
  `triggers` varchar(50) NOT NULL,
  `coping` varchar(50) DEFAULT NULL,
  `gratitude` text DEFAULT NULL,
  `log_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mood_logs`
--

INSERT INTO `mood_logs` (`log_id`, `id`, `emotion`, `sleep`, `energy`, `triggers`, `coping`, `gratitude`, `log_date`) VALUES
(15, 4, 'Stressed', 5, 5, 'Work', 'Music', 'awdaw', '2025-03-11 07:37:17'),
(16, 4, 'Stressed', 4, 5, 'Work', 'Music', 'Music', '2025-03-18 03:38:44'),
(17, 9, 'Stressed', 4, 4, 'Work', 'Talking', 'awdwa', '2025-03-18 04:26:07'),
(18, 9, 'Angry', 7, 8, 'School', 'Talking', 'Well', '2025-03-18 04:51:47'),
(19, 3, 'Jealous', 7, 5, 'School', 'Talking', 'awdawd', '2025-03-18 05:04:06'),
(20, 3, 'Tired', 5, 3, 'Work', 'Music', 'Music', '2025-03-24 00:19:44'),
(21, 3, 'Tired', 5, 3, 'Work', 'Music', 'Music', '2025-03-24 00:19:58'),
(22, 3, 'Tired', 5, 3, 'Work', 'Music', 'Music', '2025-03-24 00:20:10'),
(27, 4, 'Confused', 2, 2, 'E', 'Music', 'awd', '2025-03-24 15:48:49'),
(28, 4, 'Sad', 5, 3, 'Please', 'Music', 'awd', '2025-03-24 15:49:14'),
(29, 4, 'Sad', 3, 3, 'Please', 'Socializing', 'awdaw', '2025-03-24 15:49:58'),
(30, 4, 'Tired', 5, 3, 'Coding', 'Music', 'Music', '2025-03-24 16:05:22'),
(31, 4, 'Stressed', 3, 6, 'Basketball', 'Sports', 'Family', '2025-03-25 02:29:33'),
(32, 10, 'Confused', 6, 5, 'School', 'Exercise', 'None', '2025-03-25 03:12:04'),
(33, 4, 'Hopeful', 4, 8, 'School', 'Music', 'Money', '2025-03-31 06:25:25'),
(34, 4, 'Hopeful', 4, 7, 'School', 'Music', 'Money', '2025-03-31 06:26:37'),
(35, 4, 'Hopeful', 3, 8, 'Work', 'Music', 'Money', '2025-03-31 06:30:00'),
(36, 11, 'Tired', 6, 2, 'School', 'Sleeping', 'Anime', '2025-03-31 13:27:23'),
(37, 11, 'Stressed', 4, 5, 'School', 'Music', 'Money', '2025-03-31 14:08:24'),
(38, 11, 'Confused', 4, 5, 'School', 'Music', 'Money', '2025-03-31 14:08:24'),
(39, 4, 'Loved', 2, 6, 'Work', 'Music', 'Money', '2025-04-02 06:27:32'),
(40, 4, 'Hopeful', 2, 6, 'Work', 'Music', 'Money', '2025-04-02 06:27:32'),
(41, 4, 'Joyful', 2, 6, 'Work', 'Music', 'Money', '2025-04-02 06:27:32'),
(42, 4, 'Excited', 4, 3, 'School', 'Making Money', 'Money', '2025-04-02 06:31:02'),
(43, 4, 'Grateful', 4, 3, 'School', 'Making Money', 'Money', '2025-04-02 06:31:02'),
(44, 4, 'Proud', 4, 3, 'School', 'Making Money', 'Money', '2025-04-02 06:31:02'),
(45, 4, 'Excited', 4, 3, 'School', 'Making Money', 'Money', '2025-04-02 06:32:17'),
(46, 4, 'Grateful', 4, 3, 'School', 'Making Money', 'Money', '2025-04-02 06:32:17'),
(47, 4, 'Proud', 4, 3, 'School', 'Making Money', 'Money', '2025-04-02 06:32:17'),
(48, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:37:59'),
(49, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:37:59'),
(50, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:38:12'),
(51, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:38:12'),
(52, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:38:26'),
(53, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:38:26'),
(54, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:38:36'),
(55, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:38:36'),
(56, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:44:03'),
(57, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:44:03'),
(58, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:58:37'),
(59, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 00:58:37'),
(60, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:01:34'),
(61, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:01:34'),
(62, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:04:17'),
(63, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:04:17'),
(64, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:05:18'),
(65, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:05:18'),
(66, 4, 'Content', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:06:20'),
(67, 4, 'Loved', 6, 4, 'Work', 'Music', 'Money', '2025-04-02 01:06:20'),
(68, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:11:33'),
(69, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:11:33'),
(70, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:12:51'),
(71, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:12:51'),
(72, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:13:51'),
(73, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:13:51'),
(74, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:14:07'),
(75, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:14:07'),
(76, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:14:49'),
(77, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:14:49'),
(78, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:15:07'),
(79, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:15:07'),
(80, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:15:38'),
(81, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:15:38'),
(82, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:16:10'),
(83, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:16:10'),
(84, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:16:51'),
(85, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:16:51'),
(86, 4, 'Proud', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:19:48'),
(87, 4, 'Content', 5, 6, 'School', 'Music', 'Money', '2025-04-02 01:19:48'),
(88, 4, 'Hopeful', 4, 4, 'School', 'Music', 'Money', '2025-04-02 17:21:15'),
(89, 4, 'Loved', 4, 4, 'School', 'Music', 'Money', '2025-04-02 17:21:15'),
(90, 4, 'Content', 4, 4, 'School', 'Music', 'Money', '2025-04-02 17:21:15'),
(91, 4, 'Proud', 3, 6, 'School', 'Eating', 'Money', '2025-04-02 18:10:45'),
(92, 4, 'Grateful', 3, 6, 'School', 'Eating', 'Money', '2025-04-02 18:10:45'),
(93, 4, 'Proud', 3, 6, 'School', 'Eating', 'Money', '2025-04-02 18:11:08'),
(94, 4, 'Grateful', 3, 6, 'School', 'Eating', 'Money', '2025-04-02 18:11:08'),
(95, 4, 'Well', 3, 6, 'Friends', 'Music', 'Money', '2025-04-17 08:35:52'),
(96, 3, 'Excited', 3, 7, 'Work', 'Music', 'Money', '2025-05-14 07:42:54'),
(97, 3, 'Confident', 5, 7, 'School', 'Sports', 'Plays', '2025-05-14 07:44:59'),
(98, 3, 'Joyful', 5, 7, 'School', 'Sports', 'Plays', '2025-05-14 07:44:59'),
(99, 3, 'Proud', 5, 7, 'School', 'Gaming', 'Money', '2025-05-26 20:25:45'),
(100, 3, 'Confident', 5, 7, 'School', 'Gaming', 'Money', '2025-05-26 20:25:45'),
(101, 3, 'Well', 5, 7, 'School', 'Gaming', 'Money', '2025-05-26 20:25:45'),
(102, 3, 'Excited', 3, 6, 'School', 'Music', 'Money', '2025-05-27 17:35:19'),
(103, 3, 'Excited', 3, 3, 'School', 'Music', 'Money', '2025-05-27 19:20:38'),
(104, 3, 'Loved', 3, 3, 'School', 'Music', 'Money', '2025-05-27 19:20:38'),
(105, 3, 'Confident', 3, 3, 'School', 'Sports', 'Money', '2025-05-30 00:32:10'),
(106, 3, 'Proud', 3, 3, 'School', 'Sports', 'Money', '2025-05-30 00:32:10'),
(107, 3, 'Frustrated', 3, 5, 'School', 'Gaming', 'Wins', '2025-06-04 05:24:15'),
(108, 3, 'Frustrated', 3, 5, 'School', 'Gaming', 'Wins', '2025-06-04 05:25:03'),
(109, 3, 'Frustrated', 3, 5, 'School', 'Gaming', 'Wins', '2025-06-04 05:25:04'),
(110, 3, 'Guilty', 3, 3, 'School', 'Gaming', 'Money', '2025-06-04 07:13:18'),
(111, 3, 'Anxious', 3, 3, 'School', 'Gaming', 'Money', '2025-06-04 07:13:18'),
(112, 3, 'Dizzy', 3, 3, 'School', 'Gaming', 'Money', '2025-06-04 07:13:18'),
(113, 3, 'Frustrated', 2, 5, 'School', 'Music', 'Money', '2025-06-05 05:08:46'),
(114, 3, 'Stressed', 2, 5, 'School', 'Music', 'Money', '2025-06-05 05:08:46'),
(115, 3, 'Dizzy', 2, 5, 'School', 'Music', 'Money', '2025-06-05 05:08:46'),
(116, 3, 'Grateful', 1, 10, 'School', 'Music', 'parents', '2025-06-08 04:13:37'),
(117, 3, 'Overwhelmed', 1, 10, 'School', 'Music', 'parents', '2025-06-08 04:13:37'),
(118, 3, 'Insecure', 1, 10, 'School', 'Music', 'parents', '2025-06-08 04:13:37'),
(119, 3, 'Sad', 1, 10, 'School', 'Music', 'parents', '2025-06-08 04:13:37'),
(120, 3, 'Disappointed', 1, 10, 'School', 'Music', 'parents', '2025-06-08 04:13:37'),
(121, 12, 'Proud', 3, 5, 'School', 'Music', 'Grades', '2025-06-08 10:36:48'),
(122, 12, 'Inspired', 4, 5, 'School', 'Eating', 'Money', '2025-06-09 09:08:45'),
(123, 16, 'Grateful', 3, 5, 'Animal', 'Biking', 'Money', '2025-06-10 18:42:42'),
(124, 16, 'Hopeful', 3, 5, 'Animal', 'Biking', 'Money', '2025-06-10 18:42:42'),
(125, 12, 'Tired', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:31:38'),
(126, 12, 'Nervous', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:31:38'),
(127, 12, 'Anxious', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:31:38'),
(128, 12, 'Tired', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:31:42'),
(129, 12, 'Nervous', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:31:42'),
(130, 12, 'Anxious', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:31:42'),
(131, 12, 'Tired', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:36:02'),
(132, 12, 'Nervous', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:36:02'),
(133, 12, 'Anxious', 6, 3, 'School', 'Gaming', 'Foods', '2025-06-14 06:36:02'),
(134, 12, 'Grateful', 7, 3, 'Family', 'Eating', 'Money', '2025-06-14 06:37:10'),
(135, 12, 'Excited', 5, 8, 'Friends', 'Socializing', 'Money', '2025-06-14 06:42:27'),
(136, 12, 'Confident', 2, 1, 'Friends', 'Meditation', 'Air', '2025-06-14 06:49:54'),
(137, 12, 'Inspired', 23, 8, 'Family', 'Socializing', 'Money', '2025-06-14 06:50:39'),
(138, 12, 'Inspired', 23, 8, 'Family', 'Socializing', 'Money', '2025-06-14 06:51:11'),
(139, 12, 'Inspired', 23, 8, 'Family', 'Socializing', 'Money', '2025-06-14 06:51:17'),
(140, 12, 'Inspired', 23, 8, 'Family', 'Socializing', 'Money', '2025-06-14 06:55:18'),
(141, 12, 'Inspired', 23, 8, 'Family', 'Socializing', 'Money', '2025-06-14 06:55:48'),
(142, 12, 'Inspired', 13, 7, 'Friends', 'Socializing', 'Any', '2025-06-14 06:57:51'),
(143, 12, 'Inspired', 13, 7, 'Friends', 'Socializing', 'Any', '2025-06-14 06:57:58'),
(144, 4, 'Peaceful', 4, 7, 'School', 'Socializing', 'Money', '2025-06-14 09:09:24'),
(145, 12, 'Grateful', 4, 8, 'Family', 'Sports', 'Money', '2025-06-15 05:13:56'),
(146, 3, 'Guilty', 4, 4, 'School', 'Exercise', 'Money', '2025-06-15 09:23:20'),
(147, 3, 'Anxious', 4, 4, 'School', 'Exercise', 'Money', '2025-06-15 09:23:20'),
(148, 3, 'Dizzy', 4, 4, 'School', 'Exercise', 'Money', '2025-06-15 09:23:20'),
(149, 12, 'Angry', 6, 6, 'School', 'Gaming', 'Grades', '2025-06-16 08:01:52'),
(150, 12, 'Stressed', 6, 8, 'School', 'Meditation', 'Money', '2025-06-17 05:40:34'),
(151, 12, 'Excited', 7, 8, 'Friends', 'Music', 'money', '2025-07-07 18:44:58'),
(152, 12, 'Grateful', 7, 8, 'Friends', 'Music', 'money', '2025-07-07 18:44:58'),
(153, 12, 'Frustrated', 6, 6, 'Friends', 'Music', 'Winning', '2025-08-21 21:54:03');

-- --------------------------------------------------------

--
-- Table structure for table `personalized_advice`
--

CREATE TABLE `personalized_advice` (
  `advice_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `advice` text NOT NULL,
  `timestamp` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `personalized_advice`
--

INSERT INTO `personalized_advice` (`advice_id`, `user_id`, `advice`, `timestamp`) VALUES
(1, 3, 'Get well!', '2025-06-08 22:57:16'),
(2, 3, 'Where', '2025-06-08 23:47:26'),
(3, 12, 'Yooo', '2025-06-09 00:27:56'),
(4, 12, 'Struggling with emotions is tough, but you\'re not alone. Acknowledge your feelings, because they\'re valid. Find healthy ways to express them, like talking to someone you trust or writing things down. It takes courage to reach out for help, and that\'s a sign of strength. You\'ll get through this!', '2025-06-10 19:57:11'),
(5, 16, 'Cultivate your hope by focusing on what\'s possible and taking consistent, small steps forward. Believe in your ability to grow and adapt, even when challenges arise. Remember, hope isn\'t just a feeling; it\'s a powerful force that fuels your journey.', '2025-06-11 08:46:07'),
(6, 3, 'It\'s completely normal to feel stress from school sometimes. Would you like to explore some relaxation techniques or time management strategies that could help?', '2025-06-15 21:14:23'),
(7, 12, 'Thank you for reaching out. Could you tell me a little more about what\'s been on your mind or what you\'d like to discuss?', '2025-06-15 21:18:26'),
(8, 12, 'You can watch this attached youtube video for your emotion management!\n\nhttps://youtu.be/H4WYp9a6Yzg?si=TstrqzfCbuOmj9L3', '2025-06-16 22:09:09'),
(9, 12, 'It\'s completely normal to feel stress from school sometimes. Would you like to explore some relaxation techniques or time management strategies that could help?', '2025-06-16 22:13:00'),
(10, 15, 'Hi there! I hope you\'re doing well. Is there anything I can assist you with today?', '2025-06-16 22:15:30'),
(11, 12, 'Here is a video for a calm breathing exersice:\n\nhttps://youtu.be/LiUnFJ8P4gM?si=mCBmNZ2v46ZebV0X', '2025-06-16 22:25:26');

-- --------------------------------------------------------

--
-- Table structure for table `student_messages`
--

CREATE TABLE `student_messages` (
  `message_id` int(11) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `message_text` text NOT NULL,
  `timestamp` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_messages`
--

INSERT INTO `student_messages` (`message_id`, `sender_user_id`, `message_text`, `timestamp`) VALUES
(1, 3, 'Need help', '2025-06-08 23:24:50'),
(2, 3, 'Here at city high', '2025-06-08 23:48:27'),
(3, 12, 'Suppp', '2025-06-09 00:37:00'),
(4, 12, 'I need consultation right now', '2025-06-09 23:11:29'),
(5, 16, 'Hello, I need an advice', '2025-06-11 08:43:49'),
(6, 3, 'Wala naman nagbago', '2025-06-15 21:01:30'),
(7, 3, 'I need advice on dealing with family conflicts.', '2025-06-15 21:04:06'),
(8, 3, 'How can I manage stress from school?', '2025-06-15 21:14:09'),
(9, 3, 'Can you give me some tips for better sleep?', '2025-06-15 23:33:11'),
(10, 3, 'How can I manage stress from school?', '2025-06-15 23:33:42'),
(11, 12, 'What are some healthy ways to express anger?', '2025-06-16 22:01:24'),
(12, 12, 'How can I manage stress from school?', '2025-06-16 22:02:56'),
(13, 12, 'Yes please', '2025-06-16 22:24:16'),
(14, 12, 'How can I manage stress from school?', '2025-06-17 14:12:18'),
(15, 12, 'I need advice on dealing with family conflicts.', '2025-07-15 10:00:47');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `firstname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `birthday` date NOT NULL,
  `age` int(11) NOT NULL,
  `strand` varchar(255) DEFAULT NULL,
  `grade_level` int(11) DEFAULT NULL,
  `section` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `role` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `firstname`, `lastname`, `email`, `password`, `gender`, `birthday`, `age`, `strand`, `grade_level`, `section`, `status`, `role`) VALUES
(3, 'Marc James', 'Perez', 'marc.perez@yahoo.com', '$2y$10$41TefwOGSUiD.hLMnWGmzu21qevczVx79pBSlm6xAd4oq6jz6xh16', 'Male', '2003-12-29', 21, 'College of Engineering', 0, '4th', 'pending', ''),
(4, 'Sigmond', 'Petralba', 'petralba.sigmond@gmail.com', '$2y$10$xs1vs0QxnSbLxSvovo0He.AzmmEV5/DhEG43zx997cx9XxRlUrE8S', 'Male', '2003-12-24', 21, 'College of Engineering', 0, '3rd', 'pending', ''),
(9, 'Teddy', 'Baquiran Jr.', 'teddy.baquiran@gmail.com', '$2y$10$mTLC1t0SJhv.ULQboD6aDOJdXzbkCi7zXeEpHuoJzuRJC2lGKtIqC', 'Male', '2003-09-26', 21, 'College of Engineering', 0, '3rd', 'pending', ''),
(10, 'Raymond', 'Luna', 'raymond.luna@gmail.com', '$2y$10$hc1lo6D3dcpR0CZH2mOqW.GcANIF5bGEJjTljli2P/MStf/ks818q', 'Male', '2003-09-15', 21, 'College of Engineering', 0, '3rd', 'pending', ''),
(11, 'Rachel', 'Lucero', 'lucero.rachel@gmail.com', '$2y$10$YwcFfyjewi9cy8EUg83Bdu/zeaPDfYPbvksVMvsZyrwUhX0l8qr42', 'Female', '2003-10-06', 21, 'College of Education', 0, '3rd', 'pending', ''),
(12, 'Matt', 'Feria', 'matt.feria@gmail.com', '$2y$10$I/ui9.2.iOdBLFsPamh80ul9KhZ9ngOxbPt3tWTqAk6rLPEnQu7k6', 'Male', '2004-12-03', 20, 'HUMSS', 12, 'MARX', 'pending', ''),
(14, 'Admin', 'Admin', 'admin@gmail.com', '$2y$10$Kd5AyMgBEDsbED32Kg6XVOYk6ROYEvbaaOFmuYQfxF7b1HbipHwaW', '', '2003-12-24', 35, 'TVL', 11, 'MARX', 'pending', 'admin'),
(15, 'Uan', 'Barcelita', 'uan.barcelita@gmail.com', '$2y$10$SWezob/kqiH8CZIqsfUyh.6oaYS7VJQRbjFpzwRI5UugayjLXW9bK', 'Female', '2005-09-21', 20, 'STEM', 12, 'EULER', 'pending', 'student'),
(16, 'John Lorenz', 'Caranza', 'lorenz.caranza@gmail.com', '$2y$10$rE51qfEqTZ1JZcl9rN8Bneag3FmvCzFqQumgmtJqze/A50FmIDIlS', 'Male', '2003-12-24', 21, 'STEM', 12, 'EULER', 'pending', 'student'),
(17, 'Random', 'Random', 'random.random@gmail.com', '$2y$10$yBQd8SspM/wOnOBGGkesJ.uhX9sQMfu5f1s1GblCLFfuai42xUWsG', 'Male', '2025-06-15', 0, 'GAS', 11, 'KANT', 'pending', 'student'),
(18, 'Trial', 'Trial', 'trial@gmail.com', '$2y$10$LgWXRVxt35zGuHEr.q9dlusbvceCwuqU8aN96zx0dqCPh1YYOBWUG', 'Male', '2025-08-22', 0, 'STEM', 12, 'EULER', 'pending', 'student');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `dass21_results`
--
ALTER TABLE `dass21_results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `mood_logs`
--
ALTER TABLE `mood_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `id` (`id`);

--
-- Indexes for table `personalized_advice`
--
ALTER TABLE `personalized_advice`
  ADD PRIMARY KEY (`advice_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `student_messages`
--
ALTER TABLE `student_messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `sender_user_id` (`sender_user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `dass21_results`
--
ALTER TABLE `dass21_results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `mood_logs`
--
ALTER TABLE `mood_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- AUTO_INCREMENT for table `personalized_advice`
--
ALTER TABLE `personalized_advice`
  MODIFY `advice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `student_messages`
--
ALTER TABLE `student_messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `dass21_results`
--
ALTER TABLE `dass21_results`
  ADD CONSTRAINT `dass21_results_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `mood_logs`
--
ALTER TABLE `mood_logs`
  ADD CONSTRAINT `mood_logs_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`);

--
-- Constraints for table `personalized_advice`
--
ALTER TABLE `personalized_advice`
  ADD CONSTRAINT `personalized_advice_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_messages`
--
ALTER TABLE `student_messages`
  ADD CONSTRAINT `student_messages_ibfk_1` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
