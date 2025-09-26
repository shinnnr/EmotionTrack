"""
Alert Templates for Guidance Office Notifications
Provides standardized alert messages and severity levels for different types of alerts.
"""

def get_alert_template(alert_type, severity, user_data=None, additional_data=None):
    """Get standardized alert template based on type and severity"""

    templates = {
        'dass21_severe': {
            'low': {
                'title': 'Mild Mental Health Concern Detected',
                'message': f'Student {user_data.get("name", "Unknown")} has shown mild symptoms of {additional_data.get("scale", "mental health concerns")} in their recent assessment. Consider monitoring their progress.'
            },
            'medium': {
                'title': 'Moderate Mental Health Concern',
                'message': f'Student {user_data.get("name", "Unknown")} has shown moderate symptoms of {additional_data.get("scale", "mental health concerns")} (Score: {additional_data.get("score", "N/A")}). Schedule a follow-up consultation.'
            },
            'high': {
                'title': 'High Mental Health Concern - Immediate Attention Required',
                'message': f'URGENT: Student {user_data.get("name", "Unknown")} has shown severe symptoms of {additional_data.get("scale", "mental health concerns")} (Score: {additional_data.get("score", "N/A")}). Immediate intervention recommended.'
            },
            'critical': {
                'title': 'CRITICAL Mental Health Emergency',
                'message': f'EMERGENCY: Student {user_data.get("name", "Unknown")} has shown extremely severe symptoms of {additional_data.get("scale", "mental health concerns")} (Score: {additional_data.get("score", "N/A")}). Immediate professional intervention required.'
            }
        },
        'emotional_pattern': {
            'low': {
                'title': 'Concerning Emotional Pattern Detected',
                'message': f'Student {user_data.get("name", "Unknown")} has shown a pattern of negative emotions over the past week. Consider reaching out for a wellness check.'
            },
            'medium': {
                'title': 'Persistent Negative Emotional Pattern',
                'message': f'Student {user_data.get("name", "Unknown")} has consistently reported negative emotions for {additional_data.get("days", "multiple days")}. Schedule a consultation to discuss coping strategies.'
            },
            'high': {
                'title': 'Severe Emotional Distress Pattern',
                'message': f'ALERT: Student {user_data.get("name", "Unknown")} has shown severe emotional distress patterns. Immediate support recommended.'
            },
            'critical': {
                'title': 'Critical Emotional Crisis Indicators',
                'message': f'EMERGENCY: Student {user_data.get("name", "Unknown")} has shown critical emotional crisis indicators. Immediate intervention required.'
            }
        },
        'crisis_indicator': {
            'low': {
                'title': 'Potential Crisis Indicator',
                'message': f'Student {user_data.get("name", "Unknown")} has mentioned concerning topics that may indicate distress. Monitor closely.'
            },
            'medium': {
                'title': 'Crisis Risk Indicator',
                'message': f'Student {user_data.get("name", "Unknown")} has reported indicators suggesting potential crisis risk. Follow up immediately.'
            },
            'high': {
                'title': 'High Crisis Risk - Immediate Action Required',
                'message': f'URGENT: Student {user_data.get("name", "Unknown")} has shown multiple crisis indicators. Immediate intervention required.'
            },
            'critical': {
                'title': 'IMMEDIATE CRISIS INTERVENTION REQUIRED',
                'message': f'EMERGENCY: Student {user_data.get("name", "Unknown")} has reported acute crisis indicators. Contact emergency services if needed.'
            }
        }
    }

    if alert_type in templates and severity in templates[alert_type]:
        return templates[alert_type][severity]
    else:
        # Fallback template
        return {
            'title': f'{severity.upper()} Alert: {alert_type.replace("_", " ").title()}',
            'message': f'Student {user_data.get("name", "Unknown")} requires attention. Please review their recent activity.'
        }

def get_severity_level(score, scale_type):
    """Determine severity level based on score and scale type"""
    thresholds = {
        'depression': {'low': 14, 'medium': 21, 'high': 28, 'critical': 35},
        'anxiety': {'low': 10, 'medium': 15, 'high': 20, 'critical': 25},
        'stress': {'low': 19, 'medium': 26, 'high': 34, 'critical': 41},
        'emotional_pattern': {'low': 3, 'medium': 5, 'high': 7, 'critical': 10},
        'crisis_words': {'low': 1, 'medium': 2, 'high': 3, 'critical': 5}
    }

    if scale_type not in thresholds:
        return 'low'

    scale_thresholds = thresholds[scale_type]
    if score >= scale_thresholds['critical']:
        return 'critical'
    elif score >= scale_thresholds['high']:
        return 'high'
    elif score >= scale_thresholds['medium']:
        return 'medium'
    elif score >= scale_thresholds['low']:
        return 'low'
    else:
        return 'low'