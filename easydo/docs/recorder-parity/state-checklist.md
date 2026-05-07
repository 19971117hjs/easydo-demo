# Recorder State Checklist

Track the exact Folge Recorder states before changing the easyDo shell further.

| State | Folge captured | Spec written | easyDo matched | Notes |
| --- | --- | --- | --- | --- |
| default-ready | no | no | no | Idle recorder with all permissions granted |
| permission-blocked | no | no | no | Missing screen or accessibility permission |
| recording-live | no | no | no | Main recording session active |
| recording-paused | no | no | no | Recording session paused |
| click-stream-armed | no | no | no | Click stream just armed |
| click-stream-draining | no | no | no | Queue still finishing captures |
| area-selection-entry | no | no | no | User entering area selection flow |
| latest-capture-success | no | no | no | Fresh capture preview visible |
| recorder-error | no | no | no | Error or warning banner visible |

## Review rule

Do not mark `easyDo matched` as `yes` until there is a side-by-side screenshot review in `reviews/`.
