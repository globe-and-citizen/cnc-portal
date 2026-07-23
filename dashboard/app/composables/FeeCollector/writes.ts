// The default (unversioned) FeeCollector write composables resolve to the
// current protocol version (V1). Components that must target a specific version
// import directly from `./v0`, `./v0_1`, or `./v1` instead.
export * from './v1/writes'
