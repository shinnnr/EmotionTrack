"""
Coping Recommendations Engine for Emotion Track
Provides personalized coping strategies, relaxation techniques, and motivational content
based on user's emotional patterns and DASS-21 results.
"""

from models import MoodLog, DASS21Result, get_current_time, convert_to_manila_time
from datetime import timedelta
from collections import Counter
import random

class CopingRecommendations:
    """Engine for generating personalized coping recommendations"""

    def __init__(self, user_id):
        self.user_id = user_id
        self.emotions = []
        self.energy_levels = []
        self.sleep_hours = []
        self.triggers = []
        self.dass_results = None
        self._load_user_data()

    def _load_user_data(self):
        """Load recent user data for analysis"""
        # Get last 30 days of mood logs
        thirty_days_ago = get_current_time() - timedelta(days=30)
        recent_logs = MoodLog.query.filter(
            MoodLog.user_id == self.user_id,
            MoodLog.log_date >= thirty_days_ago
        ).all()

        self.emotions = [log.emotion for log in recent_logs]
        self.energy_levels = [log.energy for log in recent_logs if log.energy]
        self.sleep_hours = [log.sleep for log in recent_logs if log.sleep]
        self.triggers = [log.triggers for log in recent_logs if log.triggers]

        # Get latest DASS-21 result
        self.dass_results = DASS21Result.query.filter_by(user_id=self.user_id).order_by(
            DASS21Result.created_at.desc()
        ).first()

    def get_personalized_recommendations(self, limit=5):
        """Get personalized coping recommendations based on user patterns"""
        recommendations = []

        # Analyze emotional patterns
        if self.emotions:
            emotion_patterns = self._analyze_emotion_patterns()
            recommendations.extend(emotion_patterns)

        # Analyze energy and sleep patterns
        energy_sleep_recs = self._analyze_energy_sleep_patterns()
        recommendations.extend(energy_sleep_recs)

        # DASS-21 based recommendations
        if self.dass_results:
            dass_recs = self._analyze_dass_patterns()
            recommendations.extend(dass_recs)

        # General wellness recommendations
        general_recs = self._get_general_recommendations()
        recommendations.extend(general_recs)

        # Shuffle and limit results
        random.shuffle(recommendations)
        return recommendations[:limit]

    def _analyze_emotion_patterns(self):
        """Analyze emotion patterns and return targeted recommendations"""
        recommendations = []
        emotion_counter = Counter(self.emotions)

        # Most common negative emotions
        negative_emotions = ['sad', 'angry', 'frustrated', 'anxious', 'lonely', 'depressed', 'overwhelmed']
        common_negative = [emotion for emotion in emotion_counter.most_common()
                          if emotion[0].lower() in negative_emotions]

        if common_negative:
            most_common_negative = common_negative[0][0]

            if most_common_negative.lower() == 'anxious':
                recommendations.append({
                    'type': 'breathing',
                    'title': '4-7-8 Breathing Technique',
                    'description': 'Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds. Repeat 4 times.',
                    'category': 'Anxiety Relief',
                    'duration': '2 minutes'
                })
            elif most_common_negative.lower() == 'sad':
                recommendations.append({
                    'type': 'activity',
                    'title': 'Gratitude Walk',
                    'description': 'Take a 10-minute walk and note 3 things you\'re grateful for.',
                    'category': 'Mood Boost',
                    'duration': '10 minutes'
                })
            elif most_common_negative.lower() == 'angry':
                recommendations.append({
                    'type': 'mindfulness',
                    'title': 'Progressive Muscle Relaxation',
                    'description': 'Tense and release each muscle group from toes to head.',
                    'category': 'Stress Relief',
                    'duration': '5 minutes'
                })

        # Pattern of frequent negative emotions
        negative_count = sum(1 for emotion in self.emotions if emotion.lower() in negative_emotions)
        if len(self.emotions) > 5 and negative_count / len(self.emotions) > 0.6:
            recommendations.append({
                'type': 'professional',
                'title': 'Consider Professional Support',
                'description': 'Your emotion logs show persistent challenges. Consider speaking with a guidance counselor.',
                'category': 'Professional Help',
                'duration': 'Ongoing'
            })

        return recommendations

    def _analyze_energy_sleep_patterns(self):
        """Analyze energy and sleep patterns"""
        recommendations = []

        if self.energy_levels:
            avg_energy = sum(self.energy_levels) / len(self.energy_levels)
            if avg_energy < 4:
                recommendations.append({
                    'type': 'lifestyle',
                    'title': 'Energy Boost Routine',
                    'description': 'Try a short morning walk, eat a balanced breakfast, and stay hydrated throughout the day.',
                    'category': 'Energy Management',
                    'duration': 'Daily habit'
                })

        if self.sleep_hours:
            avg_sleep = sum(self.sleep_hours) / len(self.sleep_hours)
            if avg_sleep < 7:
                recommendations.append({
                    'type': 'sleep',
                    'title': 'Better Sleep Hygiene',
                    'description': 'Maintain a consistent sleep schedule, avoid screens 1 hour before bed, and create a relaxing bedtime routine.',
                    'category': 'Sleep Improvement',
                    'duration': 'Nightly routine'
                })
            elif avg_sleep > 9:
                recommendations.append({
                    'type': 'sleep',
                    'title': 'Optimize Sleep Duration',
                    'description': 'While rest is important, excessive sleep might indicate other concerns. Consider consulting about your sleep patterns.',
                    'category': 'Sleep Management',
                    'duration': 'Consultation'
                })

        return recommendations

    def _analyze_dass_patterns(self):
        """Generate recommendations based on DASS-21 results"""
        recommendations = []

        if not self.dass_results:
            return recommendations

        # Depression recommendations
        if self.dass_results.depression_severity in ['Moderate', 'Severe', 'Extremely Severe']:
            recommendations.extend([
                {
                    'type': 'activity',
                    'title': 'Daily Achievement Log',
                    'description': 'Each day, write down 3 small accomplishments, no matter how minor they seem.',
                    'category': 'Depression Support',
                    'duration': 'Daily'
                },
                {
                    'type': 'social',
                    'title': 'Connect with Others',
                    'description': 'Reach out to a friend or family member for a brief conversation. Social connection helps combat isolation.',
                    'category': 'Social Support',
                    'duration': '15 minutes'
                }
            ])

        # Anxiety recommendations
        if self.dass_results.anxiety_severity in ['Moderate', 'Severe', 'Extremely Severe']:
            recommendations.extend([
                {
                    'type': 'grounding',
                    'title': '5-4-3-2-1 Grounding Technique',
                    'description': 'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
                    'category': 'Anxiety Relief',
                    'duration': '2 minutes'
                },
                {
                    'type': 'mindfulness',
                    'title': 'Mindful Walking',
                    'description': 'Take a slow walk focusing on each step and breath. Leave your phone behind.',
                    'category': 'Mindfulness',
                    'duration': '10 minutes'
                }
            ])

        # Stress recommendations
        if self.dass_results.stress_severity in ['Moderate', 'Severe', 'Extremely Severe']:
            recommendations.extend([
                {
                    'type': 'time_management',
                    'title': 'Priority Matrix',
                    'description': 'List your tasks and categorize them by urgency and importance. Focus on important tasks first.',
                    'category': 'Stress Management',
                    'duration': '15 minutes'
                },
                {
                    'type': 'relaxation',
                    'title': 'Progressive Relaxation',
                    'description': 'Starting from your toes, tense and relax each muscle group systematically.',
                    'category': 'Relaxation',
                    'duration': '10 minutes'
                }
            ])

        return recommendations

    def _get_general_recommendations(self):
        """Get general wellness recommendations"""
        general_recs = [
            {
                'type': 'motivation',
                'title': 'Daily Affirmation',
                'description': '"I am capable of handling whatever comes my way today." Repeat this mantra when feeling overwhelmed.',
                'category': 'Motivation',
                'duration': '1 minute'
            },
            {
                'type': 'gratitude',
                'title': 'Gratitude Practice',
                'description': 'Write down 3 things you\'re grateful for. This shifts focus from problems to positives.',
                'category': 'Wellness',
                'duration': '5 minutes'
            },
            {
                'type': 'physical',
                'title': 'Quick Physical Activity',
                'description': 'Do 10 jumping jacks, push-ups, or dance to your favorite song for 2 minutes.',
                'category': 'Physical Health',
                'duration': '2 minutes'
            },
            {
                'type': 'creativity',
                'title': 'Creative Expression',
                'description': 'Draw, write, or create something small. Creative activities help process emotions.',
                'category': 'Self-Expression',
                'duration': '15 minutes'
            }
        ]

        # Return 2 random general recommendations
        return random.sample(general_recs, 2)

    def get_motivational_quote(self):
        """Get a random motivational quote based on user's current patterns"""
        quotes = [
            "You are stronger than you think. Every challenge you face is making you grow.",
            "Your feelings are valid. Give yourself permission to feel and heal.",
            "Small steps lead to big changes. Be patient with yourself.",
            "You don't have to be perfect to be worthy of love and care.",
            "This too shall pass. Difficult moments are temporary.",
            "Your mental health matters. Taking care of yourself is an act of strength.",
            "Progress, not perfection. Every effort counts.",
            "You are not alone in this. Reach out when you need support."
        ]

        return random.choice(quotes)

def get_user_coping_recommendations(user_id, limit=5):
    """Convenience function to get coping recommendations for a user"""
    engine = CopingRecommendations(user_id)
    return engine.get_personalized_recommendations(limit)

def get_user_motivational_quote(user_id):
    """Convenience function to get a motivational quote for a user"""
    engine = CopingRecommendations(user_id)
    return engine.get_motivational_quote()