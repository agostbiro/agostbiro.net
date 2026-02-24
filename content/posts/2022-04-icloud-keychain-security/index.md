---
title: "iCloud Keychain Security"
date: "2022-04-24"
---

Apple [claims](https://support.apple.com/en-us/HT202303) that iCloud Keychain 
items are end-to-end encrypted, but recoverable with an Apple ID and device 
passcode even if all devices are lost. 
The official Apple support documents don't explain well how this is possible, so
I've dug in to resolve this seeming contradiction.

The short answer is that secrets stored in iCloud Keychain are end-to-end 
encrypted, albeit with a low entropy key derived from the user’s device 
passcode. 
Apple strengthens the device passcode by limiting the number of passcode tries 
it allows to recover iCloud Keychain items with hardware security modules (HSM)
in their data centers according to their security manual. It's irrational 
for iOS users to treat Apple as an adversary, so this leaves open the 
possibility of HSM compromise[^1] or an undisclosed law enforcement 
backdoor as a threat to users’ iCloud Keychain items. It's up to each user 
to decide if these are acceptable risks.

A more detailed description of iCloud Keychain Security follows.

## Definitions

**Secure Enclave:** Hardware security module in iOS devices which protects from 
kernel compromise.

**UID:** Root cryptographic key unique to each device stored in the Secure 
Enclave. There are guarantees in place to prevent access during manufacturing.

**Passcode:** Minimum 4 digit, by default 6 digit numeric or arbitrary length 
alphanumeric code for a device set by the user.

**Keychain:** Stores secret values on the device which are encrypted with a key 
in the Secure Enclave. When the local keychain is backed up by iCloud Backup, 
it is protected with a UID-derived key, so that it can be only restored on the 
device from which it originated.

## iCloud Keychain Sync

The iCloud Keychain service syncs local keychain items marked for syncing 
within a ring of trust devices with end-to-end encryption. The ring of trust is 
created when adding a second device to an Apple ID by key exchange and iCloud 
password verification. 
Additional devices can be added to the ring of trust as long as 
there is access to at least one device already in the ring by approving them on 
that device.

## iCloud Keychain Recovery

Apple stores an iCloud Keychain backup in iCloud escrow so in case all ring of 
trust devices are lost, recovery of iCloud Keychain items is still possible as 
long as the user remembers at least one device passcode from the ring of trust 
devices and can sign in with their Apple ID. 
In case the user can’t sign in with their Apple ID, there is a time-gated 
account recovery process through Apple support where users have to provide 
certain proofs of identity, but recovering a device passcode is not possible.

The **backup** process is as follows:

1. Generate a strong random escrow key on the device.
2. Encrypt iCloud Keychain secrets with the escrow key and upload to iCloud.
3. Wrap escrow key with KDF-derived key from the device passcode.
4. Wrapped key from step 3 is encrypted with RSA-2048 public key of a 
hardware-security module (HSM) in the Cloud Key Vault. (Devices hardcode 
CA certificates of the Cloud Key Vault.)
6. Wrapped key from step 4 is sent to iCloud for storage.

The **recovery** process is as follows:

1. User logs in with Apple ID + SMS 2FA on a new device.
2. A previous ring of trust device passcode is verified by the Cloud Key Vault 
HSM with the embedded Secure Remote Password (SRP) protocol (ie. passcode is 
not sent to Apple). The remote HSM only allows 10 tries to verify the passcode
(six digit random passcode is long enough for 10 tries).
3. If successful, the HSM decrypts the wrapped escrow key from step 4 of the 
backup process and sends it to the user’s device.
4. The wrapped escrow key from step 3 of the backup process is decrypted using 
the passcode from step 2 of the recovery process and the device now has the 
escrow key which can be used to decrypt an iCloud Keychain escrow bag from 
iCloud.

The keys to reprogram HSMs are destroyed by Apple.

## Sources

[Apple Platform Security Manual, May 2021](https://manuals.info.apple.com/MANUALS/1000/MA1902/en_GB/apple-platform-security-guide-b.pdf)

[Behind the Scenes with iOS Security. Presentation by Ivan Krstić, Head of 
Security Engineering and Architecture at Apple. Black Hat 2016.](https://www.blackhat.com/docs/us-16/materials/us-16-Krstic.pdf)

---

[^1] Users can protect against certain HSM vulnerabilities like bypassing the 
maximum try limit by choosing stronger device passcodes than the default 6 
digits.
