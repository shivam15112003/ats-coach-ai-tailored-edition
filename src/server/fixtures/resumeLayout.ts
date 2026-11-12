import type { ResumeSectionData } from "../../utils/resumeLatex";
export const LAYOUT_SAMPLE: ResumeSectionData = {
  "name": "SAMPLE CANDIDATE",
  "contacts": [
    {
      "text": "sample@example.com",
      "href": "mailto:sample@example.com"
    },
    {
      "text": "github.com/sample",
      "href": "https://github.com/sample"
    }
  ],
  "summary": "Engineering graduate with experience in laboratory automation, robotics simulation, and data analysis. Develops Python tools and web interfaces that support reproducible testing, clear technical documentation, and reliable measurement workflows.",
  "education": [
    {
      "school": "Sample Technical University",
      "degree": "Master of Science in Robotics",
      "location": "Sample City",
      "dates": "2024 - 2026",
      "coursework": "Robot Dynamics, Machine Learning, Computer Vision, Control Systems"
    },
    {
      "school": "Sample Engineering College",
      "degree": "Bachelor of Technology in Engineering",
      "location": "Sample City",
      "dates": "2020 - 2024"
    }
  ],
  "experience": [
    {
      "role": "Laboratory Software Assistant",
      "company": "Sample University Laboratory",
      "location": "Sample City",
      "dates": "2025 - Present",
      "bullets": [
        "Developed Python scripts that collect laboratory measurements and prepare structured data for engineering review and reporting.",
        "Worked with laboratory researchers to identify missing measurements and document data quality issues before analysis.",
        "Created repeatable checks for sensor files and maintained clear documentation describing supported collection and review workflows."
      ]
    },
    {
      "role": "Engineering Software Intern",
      "company": "Sample Engineering Company",
      "location": "Sample City",
      "dates": "2023 - 2024",
      "bullets": [
        "Implemented React interface updates for internal engineering tools using documented requirements and feedback from project supervisors.",
        "Wrote SQL queries to retrieve equipment records and support engineering staff with routine data review tasks.",
        "Tested input validation and error handling using sample records before submitting changes for review by senior engineers."
      ]
    }
  ],
  "skills": [
    {
      "category": "Programming Languages",
      "items": "Python, TypeScript, SQL"
    },
    {
      "category": "Robotics and Analysis",
      "items": "ROS 2, scikit-learn, sensor data analysis"
    },
    {
      "category": "Development Tools",
      "items": "React, Streamlit, Git, Linux"
    }
  ],
  "certifications": [],
  "extracurricular": [],
  "projects": [
    {
      "name": "Sensor Monitoring Dashboard",
      "techStack": "Python, SQL, Streamlit",
      "dates": "",
      "bullets": [
        "Collected temperature and pressure readings from laboratory devices using Python scripts and timestamped database records.",
        "Designed SQL tables that preserve sensor identifiers, sample timestamps, engineering units, and measurement quality flags.",
        "Built a Streamlit dashboard displaying current measurements, historical trends, and configurable thresholds for laboratory users."
      ]
    },
    {
      "name": "Robotics Navigation Simulator",
      "techStack": "Python, ROS 2",
      "dates": "",
      "bullets": [
        "Implemented waypoint navigation in a simulated robot environment using Python nodes and ROS 2 communication interfaces.",
        "Integrated simulated range measurements with navigation logic to detect nearby obstacles and adjust the planned route.",
        "Recorded navigation trials and compared robot trajectories against expected waypoints using repeatable simulation test cases."
      ]
    },
    {
      "name": "Equipment Maintenance Tracker",
      "techStack": "TypeScript, React, SQL",
      "dates": "",
      "bullets": [
        "Developed a React interface for recording equipment inspections, maintenance requests, and technician notes in structured forms.",
        "Created SQL queries that retrieve maintenance history and identify open requests for each laboratory equipment record.",
        "Added form validation and clear status messages to help laboratory users submit complete equipment maintenance requests."
      ]
    },
    {
      "name": "Machine Learning Evaluation Toolkit",
      "techStack": "Python, scikit-learn",
      "dates": "",
      "bullets": [
        "Prepared reproducible training and evaluation scripts using Python and scikit-learn for labeled laboratory measurement datasets.",
        "Separated training and validation data before preprocessing to reduce information leakage during model comparison experiments.",
        "Compared classification outputs with confusion matrices and documented differences between candidate models on held-out measurements."
      ]
    }
  ]
};
