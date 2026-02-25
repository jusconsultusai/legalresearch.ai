export const PRICING = {
  proMonthly: {
    id: 'proMonthly',
    amount: 888,
    amountCentavos: 88800,
    display: '₱888',
    displayFull: '₱888/month',
    period: 'month',
    label: 'Monthly',
    description: 'Billed monthly',
  },
  proQuarterly: {
    id: 'proQuarterly',
    amountPerMonth: 710,
    amountPerMonthCentavos: 71000,
    totalAmount: 2130,
    totalAmountCentavos: 213000,
    display: '₱710',
    displayFull: '₱710/month',
    displayTotal: '₱2,130',
    period: 'quarter',
    label: 'Quarterly',
    description: 'Billed quarterly as ₱2,130',
    savings: 20,
  },
  proSemiannual: {
    id: 'proSemiannual',
    amountPerMonth: 710,
    amountPerMonthCentavos: 71000,
    totalAmount: 4260,
    totalAmountCentavos: 426000,
    display: '₱710',
    displayFull: '₱710/month',
    displayTotal: '₱4,260',
    period: 'semiannual',
    label: 'Semiannual',
    description: 'Billed semiannually as ₱4,260',
    savings: 20,
  },
  proAnnual: {
    id: 'proAnnual',
    amountPerMonth: 621,
    amountPerMonthCentavos: 62100,
    totalAmount: 7452,
    totalAmountCentavos: 745200,
    display: '₱621',
    displayFull: '₱621/month',
    displayTotal: '₱7,452',
    period: 'year',
    label: 'Annual',
    description: 'Billed annually as ₱7,452',
    savings: 30,
  },
  teamMonthly: {
    id: 'teamMonthly',
    amount: 2999,
    amountCentavos: 299900,
    display: '₱2,999',
    displayFull: '₱2,999/month',
    period: 'month',
    label: 'Monthly',
    description: 'Billed monthly',
  },
  teamQuarterly: {
    id: 'teamQuarterly',
    amountPerMonth: 2399,
    amountPerMonthCentavos: 239900,
    totalAmount: 7197,
    totalAmountCentavos: 719700,
    display: '₱2,399',
    displayFull: '₱2,399/month',
    displayTotal: '₱7,197',
    period: 'quarter',
    label: 'Quarterly',
    description: 'Billed quarterly as ₱7,197',
    savings: 20,
  },
  teamSemiannual: {
    id: 'teamSemiannual',
    amountPerMonth: 2399,
    amountPerMonthCentavos: 239900,
    totalAmount: 14394,
    totalAmountCentavos: 1439400,
    display: '₱2,399',
    displayFull: '₱2,399/month',
    displayTotal: '₱14,394',
    period: 'semiannual',
    label: 'Semiannual',
    description: 'Billed semiannually as ₱14,394',
    savings: 20,
  },
  teamAnnual: {
    id: 'teamAnnual',
    amountPerMonth: 2099,
    amountPerMonthCentavos: 209900,
    totalAmount: 25188,
    totalAmountCentavos: 2518800,
    display: '₱2,099',
    displayFull: '₱2,099/month',
    displayTotal: '₱25,188',
    period: 'year',
    label: 'Annual',
    description: 'Billed annually as ₱25,188',
    savings: 30,
  },
  proMonthlySavings: {
    amount: 0,
    display: '₱0',
    percentage: 0,
  },
  proQuarterlySavings: {
    amount: 534,
    display: '₱534',
    percentage: 20,
  },
  proSemiannualSavings: {
    amount: 1068,
    display: '₱1,068',
    percentage: 20,
  },
  proAnnualSavings: {
    amount: 3204,
    display: '₱3,204',
    percentage: 30,
  },
  teamMonthlySavings: {
    amount: 0,
    display: '₱0',
    percentage: 0,
  },
  teamQuarterlySavings: {
    amount: 1800,
    display: '₱1,800',
    percentage: 20,
  },
  teamSemiannualSavings: {
    amount: 3600,
    display: '₱3,600',
    percentage: 20,
  },
  teamAnnualSavings: {
    amount: 10800,
    display: '₱10,800',
    percentage: 30,
  },
  free: {
    amount: 0,
    display: '₱0',
    queriesLimit: 15,
    searchDays: 7,
    trialDays: 7,
    aiDocGenLimit: 3,
  },
} as const

export type PlanId = 'proMonthly' | 'proQuarterly' | 'proSemiannual' | 'proAnnual' | 'teamMonthly' | 'teamQuarterly' | 'teamSemiannual' | 'teamAnnual'

export function formatPrice(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`
}

export function getPriceDisplay(planId: PlanId): string {
  if (planId === 'proMonthly') return PRICING.proMonthly.display
  if (planId === 'proQuarterly') return PRICING.proQuarterly.display
  if (planId === 'proSemiannual') return PRICING.proSemiannual.display
  if (planId === 'proAnnual') return PRICING.proAnnual.display
  if (planId === 'teamMonthly') return PRICING.teamMonthly.display
  if (planId === 'teamQuarterly') return PRICING.teamQuarterly.display
  if (planId === 'teamSemiannual') return PRICING.teamSemiannual.display
  return PRICING.teamAnnual.display
}

export function getTotalPriceDisplay(planId: PlanId): string {
  if (planId === 'proMonthly') return `${PRICING.proMonthly.display}/month`
  if (planId === 'proQuarterly') return `${PRICING.proQuarterly.displayTotal}/quarter`
  if (planId === 'proSemiannual') return `${PRICING.proSemiannual.displayTotal}/6 months`
  if (planId === 'proAnnual') return `${PRICING.proAnnual.displayTotal}/year`
  if (planId === 'teamMonthly') return `${PRICING.teamMonthly.display}/month`
  if (planId === 'teamQuarterly') return `${PRICING.teamQuarterly.displayTotal}/quarter`
  if (planId === 'teamSemiannual') return `${PRICING.teamSemiannual.displayTotal}/6 months`
  return `${PRICING.teamAnnual.displayTotal}/year`
}

export function getBillingDescription(planId: PlanId): string {
  if (planId === 'proMonthly') return 'Billed monthly'
  if (planId === 'proQuarterly') return `Billed quarterly as ${PRICING.proQuarterly.displayTotal}`
  if (planId === 'proSemiannual') return `Billed semiannually as ${PRICING.proSemiannual.displayTotal}`
  if (planId === 'proAnnual') return `Billed annually as ${PRICING.proAnnual.displayTotal}`
  if (planId === 'teamMonthly') return 'Billed monthly'
  if (planId === 'teamQuarterly') return `Billed quarterly as ${PRICING.teamQuarterly.displayTotal}`
  if (planId === 'teamSemiannual') return `Billed semiannually as ${PRICING.teamSemiannual.displayTotal}`
  return `Billed annually as ${PRICING.teamAnnual.displayTotal}`
}

export function getSubscriptionEndDate(planId: PlanId, startDate: Date = new Date()): Date {
  const endDate = new Date(startDate)
  if (planId === 'proMonthly' || planId === 'teamMonthly') {
    endDate.setMonth(endDate.getMonth() + 1)
  } else if (planId === 'proQuarterly' || planId === 'teamQuarterly') {
    endDate.setMonth(endDate.getMonth() + 3)
  } else if (planId === 'proSemiannual' || planId === 'teamSemiannual') {
    endDate.setMonth(endDate.getMonth() + 6)
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1)
  }
  return endDate
}
