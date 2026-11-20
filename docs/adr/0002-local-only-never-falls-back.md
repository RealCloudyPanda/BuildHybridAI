# 0002: Local-only never falls back to the cloud

When Local-only is on (chosen by hand, or switched on by the sensitivity scan), every run uses `InferenceMode.ONLY_ON_DEVICE`. If Gemini Nano is unavailable, the run fails with a visible error and setup steps. It is never retried in the cloud, even though that would make the demo work on more machines. Users must be able to rely on this promise, and one silent upload of internal notes would break it for good. The cost is a worse experience on unsupported browsers.
