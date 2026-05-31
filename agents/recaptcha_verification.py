import os
import logging
from google.cloud import recaptchaenterprise_v1
from google.cloud.recaptchaenterprise_v1 import Assessment

logger = logging.getLogger("google_adk." + __name__)

# Default reCAPTCHA config for Fahem
DEFAULT_PROJECT_ID = "fahem-88d40"
DEFAULT_SITE_KEY = "6LfT9wQtAAAAAFElDHZ9ddSZHbKzMZx2-IO7PLKV"

def create_assessment(
    project_id: str, recaptcha_key: str, token: str, recaptcha_action: str
) -> Assessment:
    """Create an assessment to analyze the risk of a UI action.
    Args:
        project_id: Your Google Cloud Project ID.
        recaptcha_key: The reCAPTCHA key associated with the site/app
        token: The generated token obtained from the client.
        recaptcha_action: Action name corresponding to the token.
    """
    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

    # Set the properties of the event to be tracked.
    event = recaptchaenterprise_v1.Event()
    event.site_key = recaptcha_key
    event.token = token

    assessment = recaptchaenterprise_v1.Assessment()
    assessment.event = event

    project_name = f"projects/{project_id}"

    # Build the assessment request.
    request = recaptchaenterprise_v1.CreateAssessmentRequest()
    request.assessment = assessment
    request.parent = project_name

    response = client.create_assessment(request)

    # Check if the token is valid.
    if not response.token_properties.valid:
        print(
            "The CreateAssessment call failed because the token was "
            + "invalid for the following reasons: "
            + str(response.token_properties.invalid_reason)
        )
        return response

    # Check if the expected action was executed.
    if response.token_properties.action != recaptcha_action:
        print(
            "The action attribute in your reCAPTCHA tag does "
            + "not match the action you are expecting to score"
        )
        return response
    else:
        # Get the risk score and the reason(s).
        for reason in response.risk_analysis.reasons:
            print(reason)
        print(
            "The reCAPTCHA score for this token is: "
            + str(response.risk_analysis.score)
        )
        # Get the assessment name (id). Use this to annotate the assessment.
        assessment_name = client.parse_assessment_path(response.name).get("assessment")
        print(f"Assessment name: {assessment_name}")
    return response


def verify_recaptcha_token_safely(token: str, action: str) -> dict:
    """Wraps create_assessment with defensive fail-open logic to guarantee stability.
    
    Returns a dictionary indicating the verification outcome.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or DEFAULT_PROJECT_ID
    site_key = os.environ.get("NEXT_PUBLIC_RECAPTCHA_SITE_KEY") or DEFAULT_SITE_KEY

    logger.info(f"[reCAPTCHA Server-Side] Initiating assessment for action '{action}' on project '{project_id}'...")

    try:
        # Attempt to create the assessment calling Google's API
        response = create_assessment(
            project_id=project_id,
            recaptcha_key=site_key,
            token=token,
            recaptcha_action=action
        )

        if not response:
            logger.warning("[reCAPTCHA Server-Side] Verification returned empty response. Failing open.")
            return {"success": True, "status": "bypass_empty_response", "score": 1.0}

        # Handle invalid token properties
        if not response.token_properties.valid:
            reason = str(response.token_properties.invalid_reason)
            logger.error(f"[reCAPTCHA Server-Side] Token invalid: {reason}")
            return {
                "success": False,
                "status": "invalid_token",
                "reason": reason,
                "score": 0.0
            }

        # Check action mismatch
        if response.token_properties.action != action:
            logger.error(f"[reCAPTCHA Server-Side] Action mismatch! Expected: {action}, Found: {response.token_properties.action}")
            return {
                "success": False,
                "status": "action_mismatch",
                "score": 0.0
            }

        score = response.risk_analysis.score
        reasons = [r.name for r in response.risk_analysis.reasons]
        logger.info(f"[reCAPTCHA Server-Side] Assessment completed. Score: {score}, Reasons: {reasons}")

        return {
            "success": True,
            "status": "success",
            "score": score,
            "reasons": reasons
        }

    except Exception as e:
        logger.error(f"[reCAPTCHA Server-Side] Error during Google API assessment: {e}. Failing open to maintain service availability.")
        return {
            "success": True,
            "status": "fail_open_bypass",
            "error": str(e),
            "score": 1.0
        }
