import { BedroomDistributionChart } from './BedroomDistributionChart'
import { ProHostedChart } from './ProHostedChart'
import { RevenueByBedroomBoxPlot } from './RevenueByBedroomBoxPlot'
import { RevenueTierChart } from './RevenueTierChart'
import type { ChartDefinition } from './types'

/** The full set of cluster-analytics charts. Add/remove a chart by editing this array only. */
export const chartDefinitions: ChartDefinition[] = [
  { id: 'bedroom-distribution', label: 'Bedroom Distribution', Component: BedroomDistributionChart },
  { id: 'revenue-by-bedroom', label: 'Revenue Potential by Bedrooms', Component: RevenueByBedroomBoxPlot },
  { id: 'revenue-tier', label: 'Revenue Tier Breakdown', Component: RevenueTierChart },
  { id: 'professionally-hosted', label: 'Professionally Hosted', Component: ProHostedChart },
]
