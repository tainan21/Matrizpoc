# @matriz/platform-auth

## Responsibility (L9)
Shared mock auth contracts and types (identity, challenges, session and broker).

The V1 mock broker supports Google demo accounts, OTP, one-use magic links and
direct e-mail. Apps inject the Hub HTTP adapter; the package does not import or
depend on the Hub. A production provider can replace that adapter without
changing app skins.

## Must NOT import apps (L4). Must NOT hold app domain (L12).
