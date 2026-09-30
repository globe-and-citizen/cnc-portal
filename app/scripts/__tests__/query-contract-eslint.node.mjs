import { RuleTester } from 'eslint'
import { noCustomQueryFacadeRule } from '../../eslint.config.js'

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }
})

ruleTester.run('cnc/no-custom-query-facade', noCustomQueryFacadeRule, {
  valid: [
    'export function useExample() { const query = useQuery({}); return query }',
    'export function useDomainProjection() { return { result, error } }',
    'export function useDomainProjection() { return { data, isPending, error, refetch } }'
  ],
  invalid: [
    {
      code: `export function useExample() {
        const query = useQuery({})
        return {
          result: computed(() => query.data.value?.data),
          loading: query.isPending,
          error: query.error,
          refetch: query.refetch
        }
      }`,
      errors: [{ messageId: 'preferStandardQuery' }]
    }
  ]
})
