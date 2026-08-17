# CNC Pay — flux de paiement : cas nominal, cas limites

Synthèse de la réflexion sur comment CNC Pay (le widget de paiement embarquable) informe un
marchand qu'un paiement a réussi, sans lui imposer de complexité inutile. Pas de code ici —
un état des lieux des décisions et des questions encore ouvertes.

## Cas nominal

1. Le marchand configure le gate, embarque un `<script>` sur sa page de checkout avec
   l'adresse de sa Bank.
2. Un client arrive sur cette page, le widget charge la config du marchand avec cette adresse.
3. Pour une commande précise, la page du marchand donne la facture ID au widget au moment de
   son montage — avant que le client ne paie.
4. Le client connecte son wallet, revoit la commande, paie. Le wallet signe et diffuse
   directement sur Polygon.
5. Optionnel : le widget nous rapporte le `txHash` avec la facture ID (voir cas limite 2).
   Filet de secours si ce rapport ne nous parvient pas : mettre la facture ID directement dans
   l'appel au contrat — la transaction devient alors auto-descriptive, sans dépendre de ce
   rapport hors-chaîne.
6. Le widget attend la confirmation côté client, puis informe directement la page du marchand
   (callback JS). Le marchand enregistre le résultat dans sa propre base.
7. Les fonds sont déjà dans la Bank du marchand.

## Cas limites

### Cas limite 1 — le marchand n'a pas pu enregistrer l'info au moment du paiement

Le marchand appelle `GET /v1/payments/{facture-id}` (Recheck) avec l'adresse de sa Bank.
Côté backend : si la facture ID et le statut sont déjà en base, on renvoie ce résultat
directement. Sinon, on ne peut retrouver la transaction que si le widget a rapporté le
`txHash` à l'étape 4 — sans ça, ni la base ni la blockchain ne permettent de retrouver quoi
que ce soit, tant que le mécanisme du cas limite 2 n'existe pas.

### Cas limite 2 — notre base de données perd le lien facture ID ↔ `txHash`

Ce lien n'existe que dans notre base — pas récupérable en cas de perte. Solutions possibles :
contrat intermédiaire, ou fonction dédiée ajoutée directement à `Bank.sol`, qui émettent la
facture ID dans un événement on-chain. **Non tranché.**
