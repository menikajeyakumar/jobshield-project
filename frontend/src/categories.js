export const CATEGORY_OPTIONS = [
  { value: 'part_time_job', label: '💼 Part-Time Job' },
  { value: 'internship', label: '🎓 Internship' },
  { value: 'work_from_home', label: '💰 Work-From-Home Offer' },
  { value: 'course_training', label: '📚 Course / Training Program' },
  { value: 'scholarship', label: '🏆 Scholarship' },
  { value: 'government_scheme', label: '🎁 Government / Private Scheme' },
  { value: 'recruitment', label: '🏢 Recruitment Offer' },
  { value: 'certificate', label: '📄 Job / Internship Certificate' },
  { value: 'freelance', label: '💻 Freelance Offer' },
  { value: 'placement_job_fair', label: '📢 Placement / Job Fair Ad' },
]

export function categoryLabel(value) {
  if (!value || value === 'unclassified' || value === 'other' || value === 'none') {
    return 'Unclassified'
  }
  return CATEGORY_OPTIONS.find(c => c.value === value)?.label || 'Unclassified'
}

export const REPORT_CATEGORY_OPTIONS = [
  { value: 'asked_for_money', label: 'Asked for money' },
  { value: 'fake_company', label: 'Fake company' },
  { value: 'fake_internship', label: 'Fake internship' },
  { value: 'fake_scholarship', label: 'Fake scholarship' },
  { value: 'fake_recruitment', label: 'Fake recruitment' },
  { value: 'fake_certificate', label: 'Fake certificate' },
  { value: 'suspicious_website', label: 'Suspicious website' },
  { value: 'payment_scam', label: 'Payment scam' },
  { value: 'other', label: 'Other' },
]
