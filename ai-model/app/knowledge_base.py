"""
Campus knowledge base – sample documents for RAG.
"""

from __future__ import annotations
import logging
from .rag_service import rag_service

logger = logging.getLogger(__name__)


CAMPUS_DOCUMENTS = [
    {
        "content": """
# TA Application Process

## Eligibility Criteria
- Must be a postgraduate student (MTech/PhD) or senior undergraduate (3rd/4th year)
- CGPA requirement: Minimum 7.5 for Undergraduate students
- CGPA requirement: Minimum 7.0 for Postgraduate students
- Good academic standing with no pending disciplinary actions
- Prior teaching or tutoring experience is preferred but not mandatory

## Application Process
1. **Check Announcements**: TA positions are announced at the beginning of each semester via email and department notice board
2. **Prepare Documents**:
   - Updated resume/CV
   - Academic transcripts showing current CGPA
   - Statement of interest (max 500 words)
   - Two faculty recommendations (optional but recommended)
3. **Submit Application**: Through the official CSIS department portal
4. **Interview Process**: Shortlisted candidates will be invited for an interview with the faculty coordinator
5. **Final Selection**: Results are typically announced within one week of interviews

## TA Responsibilities
- Conducting tutorial sessions and lab demonstrations
- Grading assignments, quizzes, and exams
- Holding regular office hours (minimum 2 hours per week)
- Assisting faculty in course management and administrative tasks
- Preparing course materials when required

## Compensation
- Stipend: ₹12,000 per month for undergraduate TAs
- Stipend: ₹15,000 per month for postgraduate TAs
- Duration: One semester (renewable based on performance)

## Contact Information
For more details, contact:
- TA Coordinator: Dr. Rajesh Kumar (rajesh.kumar@goa.bits-pilani.ac.in)
- Department Office: csis.office@goa.bits-pilani.ac.in
""",
        "metadata": {
            "title": "TA Application Guidelines",
            "category": "Academic",
            "source": "CSIS Department Circular, August 2025",
        },
    },
    {
        "content": """
# Lab Booking System

## Available Facilities
### Computer Labs
1. **Lab 1 - AI & ML Lab**: 30 workstations, GPU servers available
2. **Lab 2 - Networks Lab**: 25 workstations, networking equipment
3. **Lab 3 - Software Engineering Lab**: 40 workstations
4. **Lab 4 - Data Science Lab**: 20 workstations with high-end hardware

### Meeting Spaces
1. **Seminar Hall A**: 100-person capacity, projector, audio system
2. **Conference Room 101**: 15-person capacity, video conferencing
3. **Conference Room 102**: 12-person capacity

## Booking Process
1. **Check Availability**: Log into the booking portal to view real-time availability
2. **Submit Request**: Fill out the booking form with:
   - Venue/Lab name
   - Date and time slot
   - Duration of booking
   - Purpose and expected number of attendees
   - Your contact information
3. **Approval**: Requests are reviewed by the lab administrator within 24 hours
4. **Confirmation**: You'll receive an email confirmation with booking details
5. **Track Status**: Monitor your request status in "My Requests" section

## Booking Guidelines
- Book at least 48 hours in advance for better approval chances
- Labs are available Monday-Friday, 9 AM - 6 PM
- Seminar halls available until 8 PM
- Weekend bookings require special approval
- Maximum booking duration: 4 hours per session
- Academic events get priority over personal events

## Cancellation Policy
- Cancel at least 24 hours before scheduled time
- Late cancellations may affect future booking privileges
- Multiple no-shows will result in booking restrictions

## Lab Usage Rules
- No food or beverages in computer labs
- Respect equipment; report any damages immediately
- Maintain cleanliness
- Log out and shut down systems after use
- Follow all safety protocols

## Contact
Lab Administrator: lab.admin@goa.bits-pilani.ac.in
Phone: +91-832-2580-111
""",
        "metadata": {
            "title": "Lab Booking Guidelines",
            "category": "Facilities",
            "source": "Lab Administration Handbook 2025",
        },
    },
    {
        "content": """
# Bill Reimbursement Process

## Eligible Expenses
- Conference registration fees
- Travel expenses for academic conferences
- Research-related purchases (with prior approval)
- Project materials and equipment
- Stationery for academic purposes

## Reimbursement Steps

### 1. Pre-Approval (for expenses > ₹10,000)
- Submit expense proposal to HOD
- Include justification and budget breakdown
- Wait for written approval before purchase

### 2. Document Collection
- Keep ALL original bills and receipts
- Ensure bills are in your name or department name
- GST invoices required for amounts > ₹5,000
- Payment proof (bank statement/payment receipt)

### 3. Form Submission
- Download reimbursement form from department portal
- Fill in all required fields accurately
- Attach supporting documents:
  * Original bills/invoices
  * Payment receipts
  * Bank account details (cancelled cheque copy)
  * Purpose justification letter
  * HOD approval letter (if applicable)

### 4. Submission Process
- Submit physical form to department office (Room 301)
- Get acknowledgment receipt with reference number
- Keep copies of all documents for your records

### 5. Approval Workflow
- Department office verification (2-3 days)
- HOD approval (3-5 days)
- Accounts section processing (5-7 days)
- Final approval from Dean's office (3-5 days)

### 6. Payment
- Typical processing time: 2-4 weeks from submission
- Payment via NEFT to registered bank account
- SMS/Email notification when payment is processed

## Important Guidelines
- Submit reimbursement within 30 days of expense date
- Late submissions may be rejected
- Incomplete forms will be returned
- Original bills not returned; keep photocopies
- Foreign currency expenses: Attach exchange rate proof

## Maximum Limits
- Conference travel: Up to ₹50,000 per year (with approval)
- Project materials: As per approved budget
- Stationery: ₹2,000 per semester without prior approval

## Common Rejection Reasons
- Bills not in claimant's name
- Expense not related to academic work
- Missing supporting documents
- Bills submitted after 30-day window
- Expenses without prior approval (when required)

## Contact Information
Accounts Section: accounts@goa.bits-pilani.ac.in
Department Office: csis.office@goa.bits-pilani.ac.in
Phone: +91-832-2580-100
Office Hours: 9:30 AM - 5:00 PM (Monday-Friday)
""",
        "metadata": {
            "title": "Bill Reimbursement Procedure",
            "category": "Administrative",
            "source": "Finance Department Guidelines 2025",
        },
    },
    {
        "content": """
# CSIS Department Academic Policies

## Attendance Policy
- Minimum 75% attendance required for all courses
- Medical certificates accepted for absences (submit within 3 days)
- Late arrivals (>15 minutes) may be marked absent
- Attendance shortage can lead to F grade or course deregistration

## Assignment and Submission Policy
- Late submissions: 10% penalty per day (up to 3 days)
- Submissions >3 days late: Zero marks
- Extensions granted only for medical or emergency reasons
- All submissions via designated platform (LMS/Email as specified)

## Examination Rules
- Students must carry ID card to all exams
- Arrive at least 15 minutes before exam start
- Electronic devices not permitted (except scientific calculator)
- Cheating/Plagiarism: Zero tolerance policy, may result in course failure

## Grading System
- A: 90-100, A-: 85-89
- B+: 80-84, B: 75-79, B-: 70-74
- C+: 65-69, C: 60-64, C-: 55-59
- D: 50-54
- F: Below 50 (Fail)

## Grade Appeals
- Can be filed within 7 days of grade publication
- Submit written appeal to course instructor
- If unresolved, escalate to HOD within next 7 days
- Final decision by Academic Committee

## Academic Integrity
- Zero tolerance for plagiarism
- All sources must be properly cited
- Code plagiarism detection tools used for programming assignments
- Violations can result in:
  * First offense: Zero marks on assignment + warning
  * Second offense: Course failure
  * Third offense: Disciplinary action by Institute

## Leave Policy
- Medical leave: Submit certificate within 3 days
- Emergency leave: Inform coordinator via official email
- Planned absences: Request permission at least 1 week in advance
- Academic leave: Requires Dean's approval

## Lab Work and Project Guidelines
- Lab sessions are mandatory
- Project deadlines are strict; plan accordingly
- Group projects: All members must contribute
- Project evaluation includes presentation and demonstration

## Office Hours and Support
- Faculty office hours: Posted on department website
- Lab assistance: Available during scheduled lab hours
- Academic counseling: Contact your faculty advisor
- Mental health support: Through Institute counseling center

## Course Registration
- Registration period: First week of semester
- Add/Drop period: First two weeks
- Late registration requires HOD permission
- Course prerequisites must be satisfied

## Important Contacts
- HOD: head.csis@goa.bits-pilani.ac.in
- Academic Coordinator: academic.csis@goa.bits-pilani.ac.in
- Department Office: csis.office@goa.bits-pilani.ac.in
""",
        "metadata": {
            "title": "Academic Policies and Regulations",
            "category": "Academic",
            "source": "CSIS Academic Handbook 2025-26",
        },
    },
    {
        "content": """
# CSIS Department Information

## About the Department
The Computer Science and Information Systems (CSIS) department at BITS Pilani, Goa Campus offers undergraduate and postgraduate programs in Computer Science, Information Systems, and related fields. Established in 2004, the department has grown to become one of the premier CS departments in India.

## Programs Offered
### Undergraduate
- B.E. (Hons.) Computer Science
- B.E. (Hons.) Information Systems
- Minor programs in AI/ML, Cybersecurity, Data Science

### Postgraduate
- M.E. Software Systems
- M.E. Computer Science
- Ph.D. in Computer Science

## Department Facilities
- 4 dedicated computer labs with 115+ workstations
- High-performance computing cluster
- AI/ML research lab with GPU servers
- IoT and embedded systems lab
- Research laboratories for faculty and PhD students

## Research Areas
- Artificial Intelligence and Machine Learning
- Data Science and Big Data Analytics
- Computer Networks and Security
- Software Engineering
- Cloud Computing and Distributed Systems
- Human-Computer Interaction
- Internet of Things

## Faculty
Over 25 full-time faculty members with PhDs from premier institutions worldwide. Many faculty members have active research collaborations with industry and international universities.

## Location and Timings
- Building: Academic Block 2, 3rd Floor
- Department Office: Room 301
- Office Hours: 9:00 AM - 5:00 PM (Monday-Friday)
- Lab Hours: 8:00 AM - 8:00 PM (Monday-Friday)

## Student Support Services
- Academic counseling and mentorship
- Career guidance and placement support
- Research opportunities for UG/PG students
- Industry internship facilitation
- Technical clubs and student chapters (ACM, IEEE)

## Placement Statistics (2024-25)
- Average package: ₹18 LPA
- Highest package: ₹45 LPA
- Top recruiters: Google, Microsoft, Amazon, Goldman Sachs, etc.
- 95% placement rate

## Contact Information
- Department Office: +91-832-2580-100
- Email: csis.office@goa.bits-pilani.ac.in
- Website: www.bits-pilani.ac.in/goa/csis
- HOD: head.csis@goa.bits-pilani.ac.in
""",
        "metadata": {
            "title": "CSIS Department Overview",
            "category": "General",
            "source": "Department Website",
        },
    },
]


async def load_knowledge_base() -> None:
    """Load campus documents into the RAG system."""
    logger.info("Loading campus knowledge base...")
    total = await rag_service.initialize(CAMPUS_DOCUMENTS)
    stats = rag_service.stats()
    logger.info(
        "Knowledge base loaded: %d chunks across %d categories",
        stats["total_chunks"],
        len(stats["categories"]),
    )


async def add_document(
    content: str,
    title: str,
    category: str,
    source: str | None = None,
) -> None:
    """Add a custom document to the knowledge base."""
    from datetime import datetime

    await rag_service.add_document(
        content,
        {
            "title": title,
            "category": category,
            "source": source,
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    logger.info("Added document: %s", title)
