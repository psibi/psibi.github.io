+++
title	= "Random freezes"
author	= "Sibi"
date	= 2026-06-17
draft	= true

[taxonomies]
tags = ["linux", "nixos", "hardware"]
+++

## Debugging random freezes in Linux

In early 2024, I assembled a desktop. The machine ran smoothly for the
first year or so, but after a NixOS upgrade I started getting random
freezes. Everything would freeze. I couldn't switch browser tabs, but
I could still move my mouse cursor. Clicking did nothing, and the OS
didn't respond to keyboard input either. This would last around 20 to
30 seconds, after which everything returned to normal.

It happened occasionally, maybe once a day or every two days.
Annoying, but not annoying enough to demand immediate attention.

I searched various forums and found similar threads, mostly about GPU
issues. I tried different settings, but nothing worked. This was the
kind of bug I didn't know how to debug further.

Given the popularity of LLMs, I thought this would be a good
opportunity to put one to use. The steps I describe in the rest of
this post were guided by an interactive chat with an LLM, no agents,
since I wanted to understand what was going on at each stage.

## Dmesg logs

`dmesg` (diagnostic message) is a command that prints the kernel ring
buffer, essentially a log of what the Linux kernel has been doing.

The next time the freeze happened, I checked `dmesg` and found
something interesting:

``` text
[ 7956.370041] ata1.00: status: { DRDY }
[ 7956.370044] ata1.00: failed command: WRITE FPDMA QUEUED
[ 7956.370046] ata1.00: cmd 61/00:80:90:84:36/01:00:47:00:00/40 tag 16 ncq dma 131072 out
                        res 40/00:ff:00:00:00/00:00:00:00:00/00 Emask 0x4 (timeout)
[ 7956.370052] ata1.00: status: { DRDY }
[ 7956.370055] ata1.00: failed command: WRITE FPDMA QUEUED
[ 7956.370057] ata1.00: cmd 61/08:88:98:80:80/00:00:5c:01:00/40 tag 17 ncq dma 4096 out
                        res 40/00:00:00:00:00/00:00:00:00:00/00 Emask 0x4 (timeout)
[ 7956.370063] ata1.00: status: { DRDY }
[ 7956.370066] ata1.00: failed command: WRITE FPDMA QUEUED
[ 7956.370068] ata1.00: cmd 61/08:90:30:ba:80/00:00:5c:01:00/40 tag 18 ncq dma 4096 out
                        res 40/00:00:00:00:00/00:00:00:00:00/00 Emask 0x4 (timeout)
[ 7956.370074] ata1.00: status: { DRDY }
[ 7956.370077] ata1.00: failed command: WRITE FPDMA QUEUED
[ 7956.370079] ata1.00: cmd 61/08:98:90:ad:81/00:00:5c:01:00/40 tag 19 ncq dma 4096 out
                        res 40/00:01:00:00:00/00:00:00:00:00/00 Emask 0x4 (timeout)
[ 7956.370085] ata1.00: status: { DRDY }
[ 7956.370088] ata1.00: failed command: WRITE FPDMA QUEUED
[ 7956.370090] ata1.00: cmd 61/08:a0:18:b0:81/00:00:5c:01:00/40 tag 20 ncq dma 4096 out
                        res 40/00:01:00:4f:c2/00:00:00:00:00/00 Emask 0x4 (timeout)
[ 7956.370096] ata1.00: status: { DRDY }
[ 7956.370104] ata1: hard resetting link
[ 7956.838153] ata1: SATA link up 6.0 Gbps (SStatus 133 SControl 300)
[ 7956.842299] ata1.00: configured for UDMA/133
[ 7956.842399] ata1: EH complete
```

Here's how the LLM interpreted these logs:

- The drive stopped responding to queued write commands (`WRITE FPDMA
  QUEUED`), resulting in timeouts (`Emask 0x4 (timeout)`).
- The `PHYRdyChg` error indicated the physical SATA connection between
  the motherboard and the drive had briefly dropped.
- The Linux kernel successfully performed a hard reset to recover the
  drive and re-established the connection (`SATA link up 6.0
  Gbps... EH complete`).

This pointed to a temporary hardware communication failure with a SATA
drive on port 1. Likely culprits:

1. Loose SATA cables.
2. The drive's controller is crashing or failing.

I felt a loose SATA data cable was a possibility, but the fact that
the system recovered after a short time made me doubt it. Also, I was
feeling a bit lazy to open up the cabinet and reseat cables if loose
cables weren't the issue. I wanted to see how much information I could
gather about the disk health purely from the software side before
reaching for the screwdriver.

## SMART diagnostics

**SMART diagnostics** (`smartmontools`) can query the drive's internal
health data and error counters.

First, I needed to identify the drive for `ata1`.  Then I used
**smartctl** to check the drive's SMART attributes:

```bash
sudo smartctl -A /dev/sda
```

The LLM asked me to look for these specific SMART attributes and
explained how to interpret them:

* **`199 UDMA_CRC_Error_Count`**: Greater than 0 and increasing over
  time would point to a faulty or loose SATA data cable.
* **`5 Reallocated_Sector_Ct`** or **`197 Current_Pending_Sector`**:
  Greater than 0 would indicate the drive itself is failing.
* **`192 Power-Off_Retract_Count`**: High numbers here could point to
  power supply issues.

It also suggested running a drive self-test with `smartctl -t short
/dev/sda` and checking results with `smartctl -l selftest /dev/sda`.
A passing result would mean the drive's internal mechanics are likely
fine, narrowing things down to cables or power.

Here's what I got when I ran `smartctl`:

``` shellsession
$ smartctl -A /dev/sda
smartctl 7.5 2025-04-30 r5714 [x86_64-linux-6.12.60] (local build)
Copyright (C) 2002-25, Bruce Allen, Christian Franke, www.smartmontools.org

=== START OF READ SMART DATA SECTION ===
SMART Attributes Data Structure revision number: 16
Vendor Specific SMART Attributes with Thresholds:
ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE
  1 Raw_Read_Error_Rate     0x002f   200   200   051    Pre-fail  Always       -       0
  3 Spin_Up_Time            0x0027   206   205   021    Pre-fail  Always       -       2683
  4 Start_Stop_Count        0x0032   100   100   000    Old_age   Always       -       639
  5 Reallocated_Sector_Ct   0x0033   200   200   140    Pre-fail  Always       -       0
  7 Seek_Error_Rate         0x002e   200   200   000    Old_age   Always       -       0
  9 Power_On_Hours          0x0032   089   089   000    Old_age   Always       -       8118
 10 Spin_Retry_Count        0x0032   100   100   000    Old_age   Always       -       0
 11 Calibration_Retry_Count 0x0032   100   100   000    Old_age   Always       -       0
 12 Power_Cycle_Count       0x0032   100   100   000    Old_age   Always       -       638
192 Power-Off_Retract_Count 0x0032   200   200   000    Old_age   Always       -       4
193 Load_Cycle_Count        0x0032   200   200   000    Old_age   Always       -       2961
194 Temperature_Celsius     0x0022   109   103   000    Old_age   Always       -       38
196 Reallocated_Event_Count 0x0032   200   200   000    Old_age   Always       -       0
197 Current_Pending_Sector  0x0032   200   200   000    Old_age   Always       -       0
198 Offline_Uncorrectable   0x0030   100   253   000    Old_age   Offline      -       0
199 UDMA_CRC_Error_Count    0x0032   200   200   000    Old_age   Always       -       0
200 Multi_Zone_Error_Rate   0x0008   100   253   000    Old_age   Offline      -       0
```

The SMART data looked clean to me. All values were within normal
ranges, and the self-tests completed without errors. Thankfully, no
issues from the drive's side.

## SATA Link Power Management

**SATA Link Power Management (ALPM)** controls how aggressively the
kernel puts SATA links into low-power states. If the policy is too
aggressive, the link can fail to wake up properly, causing the
`PHYRdyChg` error.

I checked the current policy:

``` shellsession
$ cat /sys/class/scsi_host/host*/link_power_management_policy
med_power_with_dipm
med_power_with_dipm
med_power_with_dipm
med_power_with_dipm
med_power_with_dipm
med_power_with_dipm
```

A value of `min_power` or `med_power_with_dipm` means the kernel is
using aggressive power saving. If the link fails to wake up properly,
it could cause the `PHYRdyChg` error.

I read the [kernel documentation](https://docs.kernel.org/scsi/link_power_management_policy.html) to understand further about it. I
found that my system was using medium power saving settings for the
SATA links, allowing them to enter low-power sleep states. And since
DIPM (Device Initiated Power Management) was enabled, the hard drive
itself could ask the motherboard to put the connection into a
low-power sleep.

I applied this possible fix in my [Nix configuration](https://github.com/psibi/dotfiles/commit/be04b04d109978b5c28e7544da948a4413d426b3):

``` diff
+  services.udev = {
+    # To avoid random freezes.
+    extraRules = ''
+      ACTION=="add|change", SUBSYSTEM=="scsi_host", KERNEL=="host*", ATTR{link_power_management_policy}="max_performance"
+    '';
+  };
```

And that actually fixed it. My system has been running with zero
freezes for the last two months.

## What caused it

I did a quick search to see if there was any kernel change related to
this and found this [Phoronix article](https://www.phoronix.com/news/SATA-Link-Power-Linux-6.11). Turns out the kernel
defaults for SATA link power management changed in version 6.11.

These are the past NixOS releases:

| Version | Codename | Release Date   | Default Kernel |
|---------|----------|----------------|----------------|
| 24.05   | Uakari   | May 31, 2024   | Linux 6.6 LTS  |
| 24.11   | Vicuña   | Nov 30, 2024   | Linux 6.6 LTS  |
| 25.05   | Warbler  | May 23, 2025   | Linux 6.12 LTS |

Now I can see why my upgrade to 25.05 resulted in this issue!

## LLM assistance

In this case, using LLM accelerated my debugging and I learned several
new things along the way. I fed it raw tool outputs, the `dmesg` logs
with ATA errors, the `smartctl` SMART attribute dump, and it helped
it helped interpret what those cryptic registers and counters actually
meant, and it pointed out exactly which fields to watch for. I had no
prior experience with kernel logs, SMART diagnostics, or SATA power
management.

After solving the issue, I tried looking up the details in man pages,
things like `UDMA_CRC_Error_Count` from the smartctl output and
`WRITE FPDMA QUEUED` from the dmesg logs, but I couldn't find
authoritative documentation for them. I found scattered forum
discussions, but nothing I'd consider a canonical reference. If anyone
can point me to proper documentation for these error codes, I'd
appreciate it. The LLM answered confidently and its explanations
matched what I observed, but I'd still prefer an authoritative source.

That said, iterating with the LLM got me to a resolution quickly for a
problem I had been living with for months, and I plan to lean on this
approach more for debugging going forward.
