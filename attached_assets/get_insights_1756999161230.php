<?php
session_start();
include '../db/db_connect.php'; // Adjust this to your actual database connection file

header('Content-Type: application/json'); // Ensure the response is JSON

// Ensure the user is logged in before proceeding
if (!isset($_SESSION['id'])) {
    echo json_encode(["error" => "User not logged in."]);
    exit;
}

$user_id = $_SESSION['id'];

// Fetch ALL mood logs for the user to get comprehensive insights
$query = "SELECT emotion, sleep, energy, triggers, coping, gratitude, log_date FROM mood_logs WHERE id = ? ORDER BY log_date ASC"; // Order by ASC for chronological charts
$stmt = $conn->prepare($query);

if (!$stmt) {
    error_log("Prepare failed for get_insights.php: (" . $conn->errno . ") " . $conn->error);
    echo json_encode(["error" => "Database query preparation failed."]);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}
$stmt->close();
$conn->close();

$emotion_counts = [];
$sleep_hours_raw = [];
$energy_levels_raw = [];
$triggers_raw = [];
$copings_raw = [];
$gratitudes_raw = [];
$sleep_data_for_chart_labels = [];
$sleep_data_for_chart_values = [];


// Process logs for various insights
foreach ($logs as $log) {
    // Emotion distribution
    $emotion_counts[$log['emotion']] = ($emotion_counts[$log['emotion']] ?? 0) + 1;

    // Sleep data (for charting)
    if ($log['sleep'] !== null && $log['sleep'] !== '') {
        $sleep_hours_raw[] = (float)$log['sleep'];
        // For the last 7 entries, prepare for sleep chart
        // Note: This assumes logs are consistently ordered by date.
        // A more robust approach might involve fetching only the last 7 distinct dates for sleep.
        // Or, get the last 7 unique log dates and their corresponding sleep values.
        // For simplicity and based on current ORDER BY, we'll take the last 7 processed logs.
        if (count($logs) >= 7 && array_search($log, $logs) >= count($logs) - 7) {
            $sleep_data_for_chart_labels[] = date('M d', strtotime($log['log_date'])); // Format date for label
            $sleep_data_for_chart_values[] = (float)$log['sleep'];
        } else if (count($logs) < 7) { // If total logs are less than 7, include all
             $sleep_data_for_chart_labels[] = date('M d', strtotime($log['log_date']));
             $sleep_data_for_chart_values[] = (float)$log['sleep'];
        }
    }


    // Energy levels
    if (!empty($log['energy'])) {
        $energy_levels_raw[] = $log['energy'];
    }

    // Triggers
    if (!empty($log['triggers'])) {
        $triggers_raw[] = $log['triggers'];
    }

    // Coping Mechanisms
    if (!empty($log['coping'])) {
        $copings_raw[] = $log['coping'];
    }

    // Gratitude
    if (!empty($log['gratitude'])) {
        $gratitudes_raw[] = $log['gratitude'];
    }
}

// --- Data for Charts ---

// Emotion Distribution (Pie Chart)
$total_emotions = array_sum($emotion_counts);
$emotion_distribution_labels = [];
$emotion_distribution_values = []; // Stored as percentage for pie chart
$most_common_emotion = 'No data';
$second_most_common_emotion = null;
$most_common_emotion_percentage = 0;

if ($total_emotions > 0) {
    arsort($emotion_counts); // Sort by frequency (descending)
    $sorted_emotions = array_keys($emotion_counts);
    $most_common_emotion = $sorted_emotions[0];
    $most_common_emotion_percentage = round(($emotion_counts[$most_common_emotion] / $total_emotions) * 100);

    if (count($sorted_emotions) > 1) {
        $second_most_common_emotion = $sorted_emotions[1];
    }

    foreach ($emotion_counts as $emotion => $count) {
        $emotion_distribution_labels[] = $emotion;
        $emotion_distribution_values[] = round(($count / $total_emotions) * 100); // Percentage
    }
}

// Sleep data (Line Chart)
$average_sleep_all_time = !empty($sleep_hours_raw) ? round(array_sum($sleep_hours_raw) / count($sleep_hours_raw), 1) : null;
$recent_avg_sleep = null;
if (count($sleep_data_for_chart_values) > 0) {
    $recent_avg_sleep = round(array_sum($sleep_data_for_chart_values) / count($sleep_data_for_chart_values), 1);
}


// Energy Distribution
$energy_counts = [];
foreach ($energy_levels_raw as $energy) {
    $energy_counts[$energy] = ($energy_counts[$energy] ?? 0) + 1;
}
arsort($energy_counts);
$most_common_energy = !empty($energy_counts) ? key($energy_counts) : 'No data';


// Trigger and Coping Distribution (Bar Charts)
$trigger_distribution_labels = [];
$trigger_distribution_values = [];
$most_frequent_trigger = 'No data';
if (!empty($triggers_raw)) {
    $trigger_counts = array_count_values($triggers_raw);
    arsort($trigger_counts);
    $most_frequent_trigger = key($trigger_counts);
    foreach ($trigger_counts as $trigger => $count) {
        $trigger_distribution_labels[] = $trigger;
        $trigger_distribution_values[] = $count;
    }
}

$coping_distribution_labels = [];
$coping_distribution_values = [];
$most_frequent_coping = 'No data';
if (!empty($copings_raw)) {
    $coping_counts = array_count_values($copings_raw);
    arsort($coping_counts);
    $most_frequent_coping = key($coping_counts);
    foreach ($coping_counts as $coping => $count) {
        $coping_distribution_labels[] = $coping;
        $coping_distribution_values[] = $count;
    }
}

// Get latest gratitude entry
$latest_gratitude = !empty($gratitudes_raw) ? end($gratitudes_raw) : 'No recent entry to display.';

// --- Psychological Insights (Text Summary) ---

$psychological_summary = [
    'emotion_summary' => '',
    'sleep_summary' => '',
    'energy_summary' => '', // Added energy summary
    'trigger_summary' => '',
    'coping_summary' => '',
    'gratitude_summary' => '', // Added gratitude summary
    'overall_summary' => ''
];

if (empty($logs)) {
    $psychological_summary = [
        'emotion_summary' => 'It seems you haven\'t started logging your emotions yet. Begin tracking your mood daily to uncover valuable insights into your well-being!',
        'sleep_summary' => 'No sleep data available. Consistent sleep tracking can reveal vital connections between rest and mood.',
        'energy_summary' => 'No energy data available. Tracking your energy levels can provide insights into your daily vitality and potential areas for improvement.',
        'trigger_summary' => 'No triggers logged. Identifying what affects your mood is the first step toward better emotional management.',
        'coping_summary' => 'No coping mechanisms logged. Discovering what helps you navigate challenges is key to resilience.',
        'gratitude_summary' => 'No gratitude entries yet. Practicing gratitude can significantly boost your mood and overall well-being.',
        'overall_summary' => 'Your emotional journey is just beginning! The more you log, the more profound your insights will become. Remember, self-awareness is a powerful tool for personal growth. Keep logging, CLSUan! 💚'
    ];
} else {
    // --- Emotion Summary ---
    $emotion_summary_text = "Your most frequently logged emotion is <strong>" . htmlspecialchars($most_common_emotion) . "</strong> (appearing in " . htmlspecialchars($most_common_emotion_percentage) . "% of your entries). ";

    switch ($most_common_emotion) {
        case 'Excited':
            $emotion_summary_text .= "This indicates a state of high enthusiasm, readiness, and positive anticipation. It suggests you're likely engaged and looking forward to experiences. This can be a great driver for productivity and positive social interactions. **Professional Advice:** Harness this excitement by channeling it into productive activities. Share your positive energy with others, as it can be contagious and foster positive environments. Be mindful of managing expectations to sustain this feeling.";
            break;
        case 'Grateful':
            $emotion_summary_text .= "Frequent feelings of gratitude highlight your ability to acknowledge and appreciate the positive aspects of your life. This emotion is strongly linked to higher levels of happiness, optimism, and resilience, and can strengthen relationships. **Professional Advice:** Continue to cultivate this mindset. Consider a daily gratitude journal or sharing your appreciation with others. This practice can help reframe challenges and build emotional strength, even during difficult times.";
            break;
        case 'Lonely':
            $emotion_summary_text .= "A dominant feeling of loneliness suggests a significant need for social connection or a perception of being isolated, even when surrounded by others. This can impact overall well-being and may point to unmet needs for belonging. **Professional Advice:** Reach out to trusted friends or family members. Explore joining school clubs, community groups, or volunteer activities that align with your interests to foster new connections. If persistent, consider talking to a school counselor or mental health professional about strategies to build meaningful connections.";
            break;
        case 'Proud':
            $emotion_summary_text .= "Experiencing pride frequently suggests you're achieving goals, recognizing your efforts, and building a healthy sense of self-worth. This reinforces positive behaviors and motivation. **Professional Advice:** Acknowledge your accomplishments, big or small. Share your successes with supportive individuals. Use this sense of achievement as motivation to pursue new challenges, but also practice self-compassion if things don't always go as planned.";
            break;
        case 'Content':
            $emotion_summary_text .= "A predominant state of contentment indicates a feeling of satisfaction, peace, and acceptance with your current circumstances. This reflects emotional stability and well-being. **Professional Advice:** Embrace this peaceful state. Continue engaging in activities that bring you this sense of ease. Practice mindfulness to fully appreciate these moments, ensuring you're present and grounded.";
            break;
        case 'Loved':
            $emotion_summary_text .= "Frequent feelings of being loved signify strong, supportive relationships and a sense of belonging. This is crucial for emotional security and overall happiness. **Professional Advice:** Nurture these valuable relationships. Express your affection and appreciation to those who make you feel loved. Healthy relationships are a cornerstone of mental well-being.";
            break;
        case 'Hopeful':
            $emotion_summary_text .= "A dominant hopeful outlook suggests optimism, a belief in positive future outcomes, and resilience in facing challenges. This fuels motivation and perseverance. **Professional Advice:** Keep focusing on your goals and aspirations. Break down larger goals into smaller, manageable steps to maintain momentum and reinforce this positive outlook. Surround yourself with positive influences and allow yourself to dream.";
            break;
        case 'Peaceful':
            $emotion_summary_text .= "Experiencing peace often indicates inner calm, reduced stress, and emotional equilibrium. This is a highly desirable state for mental well-being. **Professional Advice:** Identify what practices or environments contribute to your sense of peace and integrate them regularly into your routine. This could include meditation, spending time in nature, or quiet reflection. Protect these moments to maintain your inner harmony.";
            break;
        case 'Inspired':
            $emotion_summary_text .= "Being frequently inspired means you're open to new ideas, motivated by external influences, and capable of seeing possibilities. This can lead to creativity and personal growth. **Professional Advice:** Actively seek out sources of inspiration, whether through art, nature, stories of resilience, or intellectual pursuits. Channel this inspiration into creative projects or actions that align with your values and goals.";
            break;
        case 'Confident':
            $emotion_summary_text .= "A dominant feeling of confidence reflects self-assurance, belief in your abilities, and a strong sense of self-efficacy. This is vital for taking on challenges and navigating social situations. **Professional Advice:** Continue to challenge yourself in healthy ways to build on this confidence. Celebrate your successes, and view setbacks as learning opportunities. Remember that true confidence comes from consistent effort and self-belief, not just outcomes.";
            break;
        case 'Joyful':
            $emotion_summary_text .= "Frequent joy indicates moments of intense happiness, delight, and exuberance. This suggests you are finding profound pleasure in your experiences and connections. **Professional Advice:** Savor these joyful moments. Share them with others. Reflect on what specific circumstances or activities consistently bring you joy and actively seek to incorporate more of them into your life, fostering a positive feedback loop.";
            break;
        case 'Guilty':
            $emotion_summary_text .= "Experiencing guilt often points to a sense of remorse or responsibility for perceived wrongdoing. While guilt can be a motivator for positive change, excessive or irrational guilt can be debilitating. **Professional Advice:** Reflect on the source of your guilt. If it's about a mistake, consider making amends or learning from it. If it's irrational, challenge those thoughts and practice self-forgiveness. If persistent, speaking with a trusted adult or counselor can provide perspective and strategies for processing these feelings.";
            break;
        case 'Frustrated':
            $emotion_summary_text .= "Frequent frustration suggests you might be encountering obstacles or feeling stuck in certain situations, often due to unmet expectations or perceived lack of control. **Professional Advice:** Identify the specific sources of frustration. Can you adjust your expectations, break down tasks, or seek alternative approaches? Sometimes, taking a break or asking for help can provide a fresh perspective and alleviate this feeling. Focus on problem-solving rather than dwelling on the roadblock.";
            break;
        case 'Embarrassed':
            $emotion_summary_text .= "A dominant feeling of embarrassment indicates situations where you feel self-conscious or exposed due to a social misstep or perceived flaw. This often highlights a concern for how you are perceived by others. **Professional Advice:** Remember that everyone experiences embarrassment. Practice self-compassion and remind yourself that imperfections are part of being human. Learn from the situation, if applicable, but don't dwell on it. Focus on your inherent worth rather than external judgment.";
            break;
        case 'Hopeless':
            $emotion_summary_text .= "Frequent feelings of hopelessness are a significant concern, suggesting a loss of belief in positive future outcomes or a sense of powerlessness. This can be a sign of deeper distress. **Professional Advice:** If you consistently feel hopeless, it's crucial to reach out for professional support immediately. Talk to a trusted adult, school counselor, or mental health professional. You don't have to carry this burden alone. Focus on small, achievable steps and remember that even in darkness, light can be found with support.";
            break;
        case 'Disappointed':
            $emotion_summary_text .= "A dominant feeling of disappointment arises from unmet expectations or undesired outcomes. It's a natural response to perceived setbacks. **Professional Advice:** Acknowledge your disappointment without letting it consume you. Evaluate what led to the feeling: Were the expectations realistic? What can be learned? Refocus on what you *can* control and set new, achievable goals. Resilience is built through navigating such feelings.";
            break;
        case 'Overwhelmed':
            $emotion_summary_text .= "Frequent overwhelm indicates you might be feeling burdened by too many demands, responsibilities, or emotions. This can lead to stress and difficulty coping. **Professional Advice:** Break down large tasks into smaller ones. Prioritize what truly needs your attention and learn to say no when necessary. Practice stress-reduction techniques like deep breathing or short breaks. If the feeling persists, consider speaking with a mentor or counselor to help manage your workload or emotional state.";
            break;
        case 'Nervous':
            $emotion_summary_text .= "A dominant nervous state suggests apprehension or anxiety about upcoming events or uncertain situations. This is a natural response to perceived threats or challenges. **Professional Advice:** Prepare thoroughly for situations that make you nervous. Practice relaxation techniques like deep breathing or visualization. Reframe nervousness as excitement, as the physical sensations are similar. Focus on your strengths and past successes to build confidence.";
            break;
        case 'Resentful':
            $emotion_summary_text .= "Frequent resentment indicates unresolved anger or bitterness, often stemming from perceived unfairness or unmet expectations in relationships. This can be emotionally draining. **Professional Advice:** Identify the source of your resentment. Practice assertive communication to express your feelings and needs constructively. If direct communication isn't possible, consider journaling to process these emotions. Learning to forgive (yourself or others) can be a powerful step towards emotional freedom.";
            break;
        case 'Insecure':
            $emotion_summary_text .= "A dominant feeling of insecurity suggests self-doubt, low self-esteem, or a fear of not being good enough. This can hinder personal growth and social confidence. **Professional Advice:** Challenge negative self-talk. Focus on your strengths and past achievements. Set small, achievable goals to build confidence. Limit comparisons with others and recognize your unique value. Consider engaging in activities where you feel competent and valued.";
            break;
        case 'Sad':
            $emotion_summary_text .= "Frequent feelings of sadness suggest you might be processing loss, disappointment, or feeling overwhelmed. It's crucial to acknowledge these feelings without judgment. **Professional Advice:** Allow yourself to feel sadness without trying to suppress it. Engage in self-care activities that bring comfort. Reach out to a trusted friend, family member, or school counselor for support. Remember, it's okay not to be okay, and seeking help is a sign of strength.";
            break;
        case 'Stressed':
            $emotion_summary_text .= "Frequent stress points to an accumulation of pressures, likely from academic workloads, extracurriculars, or personal expectations. While some stress can be motivating, chronic stress can negatively impact your health and well-being. **Professional Advice:** Focus on effective time management, setting realistic boundaries, and incorporating regular stress-relief activities like exercise, mindfulness, or hobbies into your routine. Prioritize adequate rest and nutrition, as these are foundational to managing stress.";
            break;
        case 'Anxious':
            $emotion_summary_text .= "A dominant anxious state indicates that you might be experiencing significant worry, apprehension, or nervousness, possibly related to academic demands, social situations, or future uncertainties typical for high school. **Professional Advice:** Practice deep breathing, mindfulness, or engaging in light physical activity to help manage anxiety. Identify specific triggers and develop proactive strategies. Consider cognitive reframing to challenge anxious thoughts. If anxiety is debilitating, seeking support from a school counselor or mental health professional is highly recommended.";
            break;
        case 'Confused':
            $emotion_summary_text .= "Frequent confusion suggests situations where you feel uncertain, unclear, or overwhelmed by information or decisions. This can lead to indecision and frustration. **Professional Advice:** Break down complex problems into smaller parts. Seek clarification or additional information from reliable sources. Don't be afraid to ask questions or admit when you don't understand. Taking a step back can often provide clarity.";
            break;
        case 'Angry':
            $emotion_summary_text .= "A dominant angry emotion often arises from feelings of injustice, frustration, or powerlessness. It's important to understand the root cause of this anger. **Professional Advice:** Healthy ways to express anger include talking it out constructively, journaling to process your feelings, or engaging in vigorous physical exercise. Avoid suppressing it, but also ensure you're expressing it in a way that is safe and respectful to yourself and others. If anger is overwhelming, seeking professional guidance can be beneficial.";
            break;
        case 'Afraid':
            $emotion_summary_text .= "Frequent feelings of fear suggest you are encountering situations or thoughts that evoke a sense of danger, threat, or vulnerability. This is a fundamental survival emotion. **Professional Advice:** Identify the specific source of your fear. If it's a real threat, take steps to ensure your safety. If it's an imagined or exaggerated fear, challenge those thoughts. Practice courage by taking small steps outside your comfort zone. If fears are debilitating or persistent, professional support can help you develop coping mechanisms.";
            break;
        case 'Jealous':
            $emotion_summary_text .= "A dominant feeling of jealousy often stems from a fear of losing something or someone important, or from comparing yourself unfavorably to others. This emotion can erode self-esteem and relationships. **Professional Advice:** Focus on your own strengths and accomplishments rather than comparing yourself to others. Practice gratitude for what you have. Communicate openly and honestly in relationships where jealousy arises. Understand that self-worth comes from within, not from external validations or possessions.";
            break;
        case 'Tired':
            $emotion_summary_text .= "Frequent tiredness, when not directly linked to insufficient sleep, could indicate emotional exhaustion, overexertion, or a need for more rest and recovery. It impacts your overall capacity. **Professional Advice:** Evaluate your daily schedule and commitments. Are you overextending yourself? Prioritize adequate sleep and incorporate rest breaks throughout your day. Ensure your nutrition supports your energy levels. If chronic tiredness persists despite adequate rest, consult a healthcare professional to rule out underlying issues.";
            break;
        default:
            $emotion_summary_text .= "It's valuable to recognize this pattern. Understanding your most frequent emotion is the first step towards managing it effectively. **Professional Advice:** Pay attention to the situations and thoughts that precede this emotion. What message is it trying to convey? This self-awareness is key to developing tailored coping strategies.";
            break;
    }

    if ($second_most_common_emotion && abs($emotion_distribution_values[0] - ($emotion_distribution_values[1] ?? 0)) <= 10) { // If percentages are close (within 10%)
        $emotion_summary_text .= " You also frequently experience **" . htmlspecialchars($second_most_common_emotion) . "**. This shows a dynamic emotional range and that your emotional landscape is influenced by various factors. **Professional Advice:** Acknowledging the interplay between your primary emotions provides a richer understanding of your internal world. This awareness helps you develop a more nuanced approach to emotional regulation, recognizing that different situations might call for different responses.";
    }

    $psychological_summary['emotion_summary'] = $emotion_summary_text;

    // --- Energy Level Summary ---
    $energy_summary_text = "Your most common energy level is **" . htmlspecialchars($most_common_energy) . "**. ";
    switch ($most_common_energy) {
        case '10':
        case '9':
        case '8':
            $energy_summary_text .= "This indicates a **very high energy level**, suggesting robust physical and mental vitality. You likely feel alert, motivated, and highly capable of engaging with your daily tasks and challenges. **Professional Advice:** Harness this energy for productivity and positive pursuits. Be mindful not to overcommit, as even positive energy can lead to burnout if not managed with sufficient rest and balance. Continue supportive habits that fuel this vitality.";
            break;
        case '7':
        case '6':
        case '5':
            $energy_summary_text .= "This suggests a **moderate and balanced energy level**. You likely have enough energy for daily activities without feeling overly exhausted or hyperactive. Fluctuations are normal and often linked to daily activities, stress, or sleep quality. **Professional Advice:** Pay attention to patterns that lead to higher or lower energy within this range. Incorporate energy-restoring practices like short breaks, mindful eating, and light movement to maintain this healthy equilibrium. This balance is key for sustained well-being.";
            break;
        case '4':
        case '3':
            $energy_summary_text .= "A **somewhat low energy level** indicates you might be experiencing mild fatigue or reduced motivation. This can be a signal from your body or mind that you need more rest or are facing increased demands. **Professional Advice:** Reflect on recent sleep patterns, nutritional intake, and stress levels. Consider increasing your rest, ensuring balanced meals, and incorporating gentle physical activity. If this persists, evaluate potential stressors and consider small, manageable adjustments to your routine.";
            break;
        case '2':
        case '1':
        case '0':
            $energy_summary_text .= "A **very low energy level** is a significant indicator of potential fatigue, burnout, or underlying physical/mental health concerns. This impacts your ability to concentrate, engage, and cope with daily life. **Professional Advice:** This warrants serious attention. Ensure you are prioritizing ample sleep (7-9 hours for teens). Review your diet for nutritional deficiencies. Most importantly, if this low energy is persistent or accompanied by other symptoms like persistent sadness or loss of interest, **consult a healthcare professional or school counselor immediately** to explore potential causes and support strategies. You don't have to navigate this alone.";
            break;
        default:
            $energy_summary_text .= "Understanding your typical energy level is a great starting point for managing your overall well-being. **Professional Advice:** Observe how different activities, foods, and sleep patterns impact your energy throughout the day. This self-awareness will empower you to make choices that better support your vitality.";
            break;
    }
    $psychological_summary['energy_summary'] = $energy_summary_text;


    // --- Sleep Summary ---
    if ($average_sleep_all_time !== null) {
        $sleep_summary_text = "Your overall average sleep across all logs is <strong>" . htmlspecialchars($average_sleep_all_time) . " hours per night</strong>. ";
        if ($recent_avg_sleep !== null) {
            $sleep_summary_text .= "Your most recent logged sleep averages <strong>" . htmlspecialchars($recent_avg_sleep) . " hours</strong> over the last few entries. ";
        } else {
            $sleep_summary_text .= "No recent sleep data to display for the last 7 entries. ";
        }

        if ($average_sleep_all_time < 7) {
            $sleep_summary_text .= "This indicates you might be consistently getting **less than the recommended 7-9 hours for teenagers**. Chronic sleep deprivation can significantly impact your mood, concentration, academic performance, and emotional resilience, potentially contributing to feelings of irritability, anxiety, or low mood. **Professional Advice:** Prioritize sleep hygiene: aim for a consistent bedtime and wake-up time, even on weekends. Create a relaxing bedtime routine, ensure your sleep environment is dark, quiet, and cool, and limit screen time/caffeine before bed. Improving your sleep is one of the most powerful steps you can take for your mental and physical health.";
        } elseif ($average_sleep_all_time >= 7 && $average_sleep_all_time <= 9) {
            $sleep_summary_text .= "This falls within the generally **recommended range of 7-9 hours of sleep for high school students**. Good sleep habits are foundational for emotional resilience, cognitive function, learning, and physical health. Your consistent rest is a significant asset to your well-being. **Professional Advice:** Keep maintaining this healthy pattern! Continue to prioritize consistent sleep, as it directly supports your ability to manage stress, learn effectively, and regulate emotions. If you notice any deviations, actively return to your healthy sleep routine.";
        } else { // > 9 hours
            $sleep_summary_text .= "Consistently getting **more than 9 hours of sleep might indicate oversleeping**. While some individuals naturally need slightly more rest, persistent excessive sleep can sometimes be linked to underlying health considerations (e.g., fatigue, nutrient deficiencies) or feelings of low mood like depression, or a lack of engagement during waking hours. **Professional Advice:** Reflect on whether this sleep pattern feels truly restorative or if you still experience fatigue during the day. If oversleeping is chronic and leaves you feeling tired, consider consulting a doctor to rule out any medical causes or a mental health professional to discuss its potential connection to your emotional state.";
        }
        if ($most_common_energy === 'Low' && $average_sleep_all_time >= 7) {
            $sleep_summary_text .= " Interestingly, despite adequate sleep, your energy is often low. **Professional Advice:** This might suggest other factors, like diet, hydration, physical activity levels, or unmanaged stress, could be impacting your vitality. Consider exploring these areas with a holistic approach to boost your energy, even with sufficient sleep.";
        }
    } else {
        $sleep_summary_text = 'No sleep data available to provide an interpretation. **Professional Advice:** Tracking your sleep can help reveal its profound connection to your emotional state and overall well-being. Start logging your sleep hours consistently to gain this vital insight.';
    }
    $psychological_summary['sleep_summary'] = $sleep_summary_text;


    // --- Trigger Summary ---
    if (!empty($trigger_distribution_labels)) {
        $trigger_summary_text = "The most frequent trigger you've identified is **" . htmlspecialchars($most_frequent_trigger) . "**. ";
        switch ($most_frequent_trigger) {
            case 'Academic Pressure':
            case 'Exams/Quizzes':
            case 'School Work':
                $trigger_summary_text .= "Academic demands appear to be a significant influence on your emotional state. This is highly common among high school students due to workload, expectations, and future planning. **Professional Advice:** Develop effective study habits like breaking down large assignments, using a planner for time management, and seeking clarification from teachers. Practice realistic self-talk about grades and efforts. Incorporate short, mindful breaks during study sessions to prevent burnout.";
                break;
            case 'Social Interactions':
            case 'Conflicts':
            case 'Peer Pressure':
                $trigger_summary_text .= "Your emotions are frequently impacted by interactions with others, highlighting the profound influence of social dynamics. This might suggest a need to develop stronger communication skills, boundary setting, or strategies for navigating interpersonal challenges more effectively. **Professional Advice:** Practice assertive communication: express your needs and feelings clearly and respectfully. Learn to set healthy boundaries to protect your emotional energy. Engage in social interactions that feel supportive and uplifting, and critically evaluate the influence of peer pressure on your decisions.";
                break;
            case 'Family Issues':
            case 'Home Environment':
                $trigger_summary_text .= "Challenges within your family or home environment seem to be a recurring emotional trigger. The home is a foundational space for well-being, so discord here can significantly impact mood. **Professional Advice:** Identify specific issues contributing to the stress. If safe and appropriate, consider open and respectful communication with family members to express your feelings and needs. If direct resolution is difficult, seek support from a trusted adult outside the home (e.g., a school counselor, relative) who can offer an objective perspective or guidance.";
                break;
            case 'Future Uncertainty':
            case 'Personal Doubts':
                $trigger_summary_text .= "Anxiety about the future or self-doubt appears to be a common trigger. It's normal to feel uncertain about what comes next, especially during pivotal high school years as you prepare for college or career paths. **Professional Advice:** Focus on what you **can** control in the present moment, such as your effort in studies, developing skills, or pursuing hobbies. Practice mindfulness to anchor yourself. Set small, achievable goals to build a sense of progress and competence, which can reduce future-oriented anxiety. Talk to trusted adults about your concerns; they can offer perspective and guidance.";
                break;
            case 'Lack of Sleep':
                $trigger_summary_text .= "It's insightful that you recognize 'Lack of Sleep' as a trigger. This highlights the direct, undeniable connection between your physical rest and emotional regulation. Insufficient sleep compromises your ability to cope with stress, manage emotions, and maintain a positive outlook. **Professional Advice:** Prioritizing consistent, quality sleep is paramount for managing your mood and reactions to daily stressors. Review sleep hygiene practices diligently (consistent schedule, dark room, winding down). View sleep as a non-negotiable foundation for your mental health.";
                break;
            case 'Overthinking':
                $trigger_summary_text .= "Identifying 'Overthinking' as a trigger is a significant step. This suggests you might get caught in cycles of rumination or excessive analysis, which can exacerbate negative emotions like anxiety or sadness. **Professional Advice:** Develop strategies to interrupt overthinking, such as setting a timer for 'worry time,' journaling to externalize thoughts, engaging in mindfulness exercises to stay in the present, or redirecting your attention to engaging, constructive activities. Cognitive Behavioral Therapy (CBT) techniques can be particularly helpful here.";
                break;
            case 'Health Concerns':
                $trigger_summary_text .= "Your health significantly impacts your mood. This could be related to chronic conditions, acute illness, or general worries about your physical well-being. **Professional Advice:** Prioritize both your physical and mental health. Consult healthcare professionals for any physical concerns. Acknowledge the emotional toll that health issues can take and practice self-compassion. Engage in gentle self-care activities and ensure you are following medical advice, as physical well-being strongly influences emotional well-being.";
                break;
            case 'Media/News':
                $trigger_summary_text .= "Exposure to media or news seems to influence your mood. While staying informed is important, constant exposure to negative or overwhelming news can contribute to anxiety and stress. **Professional Advice:** Be mindful of your media consumption. Set boundaries on how much time you spend on news or social media, and consider diversifying your sources. Focus on reputable news outlets and balance heavy topics with uplifting or informative content. Engage in offline activities to maintain perspective.";
                break;
            case 'Finances':
                $trigger_summary_text .= "Financial concerns are impacting your mood, which can be a source of significant stress, even for high school students (e.g., allowances, future costs). **Professional Advice:** If applicable, discuss these concerns with trusted adults who can offer guidance or support. Focus on managing what you can control, such as responsible spending or saving habits. Financial literacy and planning can help alleviate some anxiety.";
                break;
            default:
                $trigger_summary_text .= "Recognizing your primary trigger, **" . htmlspecialchars($most_frequent_trigger) . "**, is a powerful step towards emotional self-management. This awareness allows you to anticipate, prepare for, or even adjust your response to situations that negatively impact your mood. **Professional Advice:** Once a trigger is identified, you can develop targeted strategies. This might involve avoiding certain situations (if healthy), learning new coping skills to apply when faced with the trigger, or reframing your thoughts about it. Consistent tracking will deepen your understanding.";
                break;
        }
    } else {
        $trigger_summary_text = 'No specific triggers logged yet. **Professional Advice:** Identifying your triggers is crucial for understanding and proactively managing your emotional responses. Pay close attention to what situations, thoughts, or interactions consistently precede a shift in your mood. Journaling about these connections can be highly insightful.';
    }
    $psychological_summary['trigger_summary'] = $trigger_summary_text;

    // --- Coping Summary ---
    if (!empty($coping_distribution_labels)) {
        $coping_summary_text = "Your most frequent coping mechanism is **" . htmlspecialchars($most_frequent_coping) . "**. ";
        switch ($most_frequent_coping) {
            case 'Listening to Music':
                $coping_summary_text .= "Music is a powerful emotional regulator. Its ability to influence mood, evoke memories, and provide a healthy distraction makes it an excellent coping tool. **Professional Advice:** Continue to use music mindfully. Explore different genres that align with your desired mood (e.g., calming music for anxiety, upbeat music for low energy). Consider creating playlists for different emotional states. It can be a healthy way to process feelings or shift your perspective.";
                break;
            case 'Exercising':
            case 'Sports':
                $coping_summary_text .= "Engaging in physical activity like exercise or sports is a highly effective and healthy coping mechanism. It releases endorphins, reduces stress hormones, and provides an outlet for pent-up energy or frustration. **Professional Advice:** Maintain consistency in your physical activity. Find forms of exercise you genuinely enjoy to make it sustainable. Balance vigorous activity with rest. Remember that physical health is intrinsically linked to mental health.";
                break;
            case 'Talking to Friends/Family':
            case 'Socializing':
                $coping_summary_text .= "Seeking social connection and talking to trusted individuals are robust coping strategies. This provides validation, perspective, and emotional support, reminding you that you're not alone. **Professional Advice:** Nurture these supportive relationships. Practice active listening and open communication. Be discerning about who you confide in, choosing individuals who offer empathy and constructive support. Remember, vulnerability can strengthen bonds.";
                break;
            case 'Reading/Hobbies':
                $coping_summary_text .= "Engaging in hobbies like reading or other creative pursuits offers a healthy form of escapism, mental stimulation, and a sense of accomplishment. It allows for positive distraction and personal growth. **Professional Advice:** Continue to allocate dedicated time for your hobbies. Explore new interests that spark your curiosity and passion. These activities provide a crucial balance to academic or social pressures and contribute significantly to your overall well-being.";
                break;
            case 'Spending Time in Nature':
                $coping_summary_text .= "Connecting with nature is a powerful and restorative coping mechanism. It reduces stress, improves mood, and provides a sense of calm and perspective. **Professional Advice:** Make spending time outdoors a regular practice. Even short walks in a park or sitting in a green space can be beneficial. Pay attention to your senses—the sights, sounds, and smells of nature—to enhance its grounding effects. This practice fosters mindfulness and reduces mental fatigue.";
                break;
            case 'Journaling':
                $coping_summary_text .= "Journaling is an excellent introspective coping mechanism. It provides a safe space to process thoughts and emotions, identify patterns, gain clarity, and self-reflect without judgment. **Professional Advice:** Continue to nurture this practice. Experiment with different journaling techniques (e.g., stream of consciousness, gratitude journaling, thought records). Regular journaling can be a powerful tool for emotional regulation, problem-solving, and deepening self-understanding.";
                break;
            case 'Meditation':
                $coping_summary_text .= "Practicing meditation or mindfulness is a highly effective way to manage stress, improve emotional regulation, and cultivate inner peace. It helps you observe thoughts without judgment. **Professional Advice:** Make meditation a consistent practice, even if only for a few minutes daily. Explore guided meditations or mindfulness apps. Regular practice can significantly enhance your ability to remain calm and focused amidst daily challenges.";
                break;
            case 'Sleeping':
                $coping_summary_text .= "While sleep is essential for physical and mental restoration, relying on **excessive sleep** as a primary coping mechanism can sometimes be a form of avoidance, preventing you from actively addressing underlying emotions or challenges. **Professional Advice:** Evaluate if your sleep is truly restorative or if you're using it to escape. Ensure you're getting adequate, but not excessive, sleep. Consider complementing sleep with more active coping strategies like problem-solving, emotional expression, or engaging in hobbies to address issues rather than merely postponing them.";
                break;
            case 'Eating':
                $coping_summary_text .= "Using eating as a coping mechanism can offer temporary comfort or distraction. However, if it's a primary or disproportionate response to stress or negative emotions, it can lead to unhealthy patterns. **Professional Advice:** Practice mindful eating: pay attention to your hunger cues and the emotional triggers for eating. Explore diversifying your coping toolkit with non-food related strategies. If you find yourself consistently turning to food for emotional comfort, consider speaking with a trusted adult or professional about developing healthier emotional regulation techniques.";
                break;
            case 'Gaming':
                $coping_summary_text .= "Gaming can be a fun and engaging distraction. However, if it becomes a primary coping mechanism for escaping difficult emotions or responsibilities, it might indicate an imbalance. **Professional Advice:** Ensure gaming remains a healthy hobby and not a substitute for addressing real-life challenges. Set limits on screen time. Balance gaming with other activities like exercise, social interactions, and productive pursuits. Reflect on whether gaming helps you recharge or if it hinders your ability to cope effectively with stressors.";
                break;
            case 'Asking for Help':
                $coping_summary_text .= "It's highly commendable that 'Asking for Help' is a frequent coping strategy for you. This demonstrates self-awareness, strength, and a proactive approach to well-being. Recognizing when you need support is a crucial life skill. **Professional Advice:** Continue to build and utilize your support network, whether it's friends, family, teachers, mentors, or school counselors. Knowing who to turn to and how to articulate your needs is invaluable for navigating challenges and fostering resilience.";
                break;
            case 'Problem-Solving':
                $coping_summary_text .= "Identifying 'Problem-Solving' as a coping mechanism indicates a proactive and resilient approach to challenges. You're likely engaging directly with issues rather than avoiding them. **Professional Advice:** Continue to refine your problem-solving skills. Break down problems into smaller, manageable steps. Brainstorm various solutions and evaluate their pros and cons. This active engagement empowers you and builds confidence in your ability to navigate difficulties.";
                break;
            default:
                $coping_summary_text .= "It's great that you've identified a go-to coping mechanism. Regularly engaging in strategies that help you manage stress and difficult emotions is vital for maintaining your mental well-being. **Professional Advice:** Reflect on the effectiveness of this coping mechanism. Does it genuinely help you process emotions and find solutions, or does it merely provide a temporary escape? Consider exploring and diversifying your coping toolkit to build a broader range of emotional regulation skills.";
                break;
        }
    } else {
        $coping_summary_text = 'No coping mechanisms logged yet. **Professional Advice:** Identifying and utilizing healthy coping strategies is essential for emotional well-being. Think about what genuinely helps you feel better when you\'re down or stressed, and try to consciously engage in those activities. Building a diverse coping toolkit prepares you for various life challenges.';
    }
    $psychological_summary['coping_summary'] = $coping_summary_text;

    // --- Gratitude Summary ---
    if (!empty($gratitudes_raw)) {
        $gratitude_summary_text = "Your recent entry shows you are grateful for: **\"" . htmlspecialchars($latest_gratitude) . "\"**. This act of reflecting on gratitude is a powerful positive psychology practice. It shifts your focus toward positive aspects of your life, promoting an upward spiral of well-being, increased optimism, and stronger relationships. **Professional Advice:** Make gratitude a regular ritual. Even jotting down 3-5 specific things daily can profoundly impact your mood and resilience. Try to vary what you're grateful for and be specific (e.g., instead of 'family,' try 'my sister helped me with my homework') to enhance its emotional impact and keep the practice fresh. Consider expressing your gratitude directly to others when appropriate.";
    } else {
        $gratitude_summary_text = "No gratitude entries yet. **Professional Advice:** Practicing gratitude, even for small things, is a powerful exercise that cultivates positivity, improves mood, and builds resilience against life's challenges. Try to start a gratitude practice by reflecting daily on at least one thing you are thankful for. This simple act can profoundly shift your perspective and foster a more optimistic outlook.";
    }
    $psychological_summary['gratitude_summary'] = $gratitude_summary_text;


    // --- Overall Summary ---
    $overall_summary_text = "Based on your emotional logs, you are actively engaging in self-reflection, which is a powerful step towards emotional intelligence and growth. Your journey reveals valuable patterns in your emotional landscape. ";

    // Combine emotion, energy, sleep, trigger, coping insights into overall
    if ($most_common_emotion === 'Happy' || $most_common_emotion === 'Calm' || $most_common_emotion === 'Joyful' || $most_common_emotion === 'Content') {
        $overall_summary_text .= "You demonstrate a commendable ability to maintain a generally positive and stable emotional state. This resilience is a great asset! ";
        if ($average_sleep_all_time !== null && $average_sleep_all_time < 7) {
            $overall_summary_text .= "However, despite these positive emotions, consistent insufficient sleep could undermine your long-term well-being. Prioritizing rest is crucial even when feeling good. ";
        }
    } elseif ($most_common_emotion === 'Anxious' || $most_common_emotion === 'Stressed' || $most_common_emotion === 'Sad' || $most_common_emotion === 'Overwhelmed' || $most_common_emotion === 'Hopeless') {
        $overall_summary_text .= "It appears you are navigating a period with significant emotional challenges. It's important to be kind to yourself during these times. Your logs suggest clear areas where focusing your energy can lead to significant improvements in your well-being. ";
        if ($average_sleep_all_time !== null && $average_sleep_all_time < 7) {
            $overall_summary_text .= "Improving your sleep habits could be a foundational step, as insufficient rest often exacerbates feelings of anxiety and stress. ";
        }
        if ($most_common_energy === 'Low') {
            $overall_summary_text .= "Addressing your low energy levels in conjunction with these emotions is also vital; perhaps explore dietary factors, hydration, or gentle movement. ";
        }
        if ($most_frequent_trigger !== 'No data') {
            $overall_summary_text .= "By understanding your main trigger (<strong>" . htmlspecialchars($most_frequent_trigger) . "</strong>), you can develop proactive strategies to mitigate its impact and build greater resilience. ";
        }
        if ($most_frequent_coping !== 'No data' && ($most_frequent_coping === 'Sleeping' || $most_frequent_coping === 'Eating' || $most_frequent_coping === 'Gaming')) {
            $overall_summary_text .= "While your primary coping mechanism of <strong>" . htmlspecialchars($most_frequent_coping) . "</strong> offers temporary relief, consider diversifying your coping strategies to include more active or expressive methods for long-term emotional processing. ";
        }
    } else {
        $overall_summary_text .= "You are clearly attuned to your internal experiences, which is a vital component of emotional well-being. ";
    }

    $overall_summary_text .= "Continue to observe how different aspects of your life (sleep, specific triggers, coping activities, and gratitude) influence your emotions. This awareness is your superpower in navigating challenges and cultivating a balanced emotional life. Remember that growth is a continuous process, and every entry is a step forward in understanding yourself better. Keep logging, and keep growing! 💚";
    $psychological_summary['overall_summary'] = $overall_summary_text;
}


$response_data = [
    "total_logs" => count($logs),
    "most_common_emotion" => $most_common_emotion,
    "second_most_common_emotion" => $second_most_common_emotion,
    "most_common_emotion_percentage" => $most_common_emotion_percentage,
    "average_sleep_all_time" => $average_sleep_all_time,
    "recent_avg_sleep" => $recent_avg_sleep, // Added for potential use in JS summary
    "most_common_energy" => $most_common_energy, // Added for use in JS summary
    "most_frequent_trigger" => $most_frequent_trigger,
    "most_frequent_coping" => $most_frequent_coping,
    "latest_gratitude" => $latest_gratitude,
    "emotion_distribution" => [
        "labels" => $emotion_distribution_labels,
        "values" => $emotion_distribution_values
    ],
    "sleep_data" => [
        "labels" => $sleep_data_for_chart_labels,
        "values" => $sleep_data_for_chart_values
    ],
    "trigger_distribution" => [
        "labels" => $trigger_distribution_labels,
        "values" => $trigger_distribution_values
    ],
    "coping_distribution" => [
        "labels" => $coping_distribution_labels,
        "values" => $coping_distribution_values
    ],
    "psychological_summary" => $psychological_summary
];

echo json_encode($response_data);
?>