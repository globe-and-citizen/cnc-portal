/** The normal app type gate checks the settings form's production prop boundary. */
import type { CampaignManagerSettings } from '@/composables/campaign/reads'
import type CampaignManagerRatesForm from '@/components/sections/ContractManagementView/forms/CampaignManagerRatesForm.vue'

type Assert<T extends true> = T
type Fits<Value, Target> = [Value] extends [Target] ? true : false
type Settings = InstanceType<typeof CampaignManagerRatesForm>['$props']['settings']
type Props = InstanceType<typeof CampaignManagerRatesForm>['$props']
type WithoutClick = Omit<CampaignManagerSettings, 'costPerClick'>
type WithoutImpression = Omit<CampaignManagerSettings, 'costPerImpression'>
type WithoutBank = Omit<CampaignManagerSettings, 'bankAddress'>
export type ReadModelFitsForm = Assert<Fits<CampaignManagerSettings, Settings>>
export type NoResetHandshake = Assert<'reset' extends keyof Props ? false : true>
// @ts-expect-error Both rates are required.
export type MissingClick = Assert<Fits<WithoutClick, Settings>>
// @ts-expect-error Both rates are required.
export type MissingImpression = Assert<Fits<WithoutImpression, Settings>>
// @ts-expect-error The Bank destination is required.
export type MissingBank = Assert<Fits<WithoutBank, Settings>>
// @ts-expect-error Arbitrary key/value rows are not manager settings.
export type NoDictionaryRoundTrip = Assert<Fits<{ key: string; value: string }[], Settings>>
