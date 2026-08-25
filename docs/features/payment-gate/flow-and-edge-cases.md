# CNC Pay — flux de paiement : cas nominal, cas limites

Synthèse de la réflexion sur comment CNC Pay (le widget de paiement embarquable) informe un marchand qu'un paiement a réussi, sans lui
imposer de complexité inutile. Pas de code ici — un état des lieux des décisions et des questions encore ouvertes.

## Cas nominal

1. Le marchand configure le gate, embarque un `<script>` sur sa page de checkout avec l'adresse de sa Bank.
2. Un client arrive sur cette page, le widget charge la config du marchand avec cette adresse.
3. Pour une commande précise, la page du marchand donne la facture ID au widget au moment de son montage — avant que le client ne paie.
4. Le client connecte son wallet, revoit la commande, paie. Le wallet signe et diffuse directement sur Polygon.
5. Optionnel : le widget nous rapporte le `txHash` avec la facture ID (voir cas limite 2). Filet de secours si ce rapport ne nous parvient
   pas : mettre la facture ID directement dans l'appel au contrat — la transaction devient alors auto-descriptive, sans dépendre de ce
   rapport hors-chaîne.
6. Le widget attend la confirmation côté client, puis informe directement la page du marchand (callback JS). Le marchand enregistre le
   résultat dans sa propre base.
7. Les fonds sont déjà dans la Bank du marchand.

## Cas limites

### Cas limite 1 — le marchand n'a pas pu enregistrer l'info au moment du paiement

Le marchand appelle `GET /v1/payments/{facture-id}` (Recheck) avec l'adresse de sa Bank. Côté backend : si la facture ID et le statut sont
déjà en base, on renvoie ce résultat directement. Sinon, on ne peut retrouver la transaction que si le widget a rapporté le `txHash` à
l'étape 4 — sans ça, ni la base ni la blockchain ne permettent de retrouver quoi que ce soit, tant que le mécanisme du cas limite 2 n'existe
pas.

### Cas limite 2 — notre base de données perd le lien facture ID ↔ `txHash`

Ce lien n'existe que dans notre base — pas récupérable en cas de perte. Solutions possibles : contrat intermédiaire, ou fonction dédiée
ajoutée directement à `Bank.sol`, qui émettent la facture ID dans un événement on-chain. **Non tranché.**

## Précisions pour le contrat d'intégration (#2461)

### Répartition des responsabilités

| Côté CNC Pay                                                     | Côté marchand                                  |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| Contrats de règlement (`Bank.sol`, `AdCampaignManager.sol`)      | Détermine et affiche le prix à payer           |
| Widget : connexion wallet, soumission de la transaction          | Génère la facture ID (référence de commande)   |
| Vérification de secours (`Recheck`) si le callback direct échoue | Héberge la page de checkout, y monte le widget |
| Ne stocke jamais de donnée personnelle du client                 | Traite le callback, remplit la commande        |

### Quote vs Charge — pas d'objet « quote » séparé

Le prix affiché dans Review est déterminé et affiché par le marchand lui-même, avant même que le widget ne charge quoi que ce soit — ce
n'est pas quelque chose que CNC Pay calcule ou sert. Le widget ne va jamais chercher un prix auprès de notre backend : le montant vient du
marchand (attribut au montage), et c'est ce montant qui est directement soumis comme transaction.

Donc pas de « quote » séparé avec sa propre expiration à gérer — le prix appartient entièrement au marchand, comme n'importe quel autre
champ de son propre catalogue. Ce qui existe côté CNC Pay, c'est uniquement la transaction déjà soumise (le « charge »), jamais un devis
préalable. Pour « Pay as you go », même logique : pas de prix fixe, un taux (`$0.08/clic`), jamais un devis.

### Signature du callback

Montage du widget, avec la facture ID et le montant fournis par le marchand. L'adresse Bank reste sur le `<script>` (une fois par page, voir
cas nominal étape 1) ; le reste est propre à cette commande précise et vient sur la `<div>` de montage :

```html
<div
  id="cnc-pay"
  data-facture-id="order_8842"
  data-amount="128.00"
  data-token="USDC"
  data-on-status="handlePaymentStatus"
></div>
```

`data-on-status` référence une fonction déjà définie dans la portée globale de la page du marchand — pas de bundler ni de module requis pour
l'intégrer :

```js
function handlePaymentStatus(event) {
  // event = {
  //   factureId: "order_8842",
  //   status: "paid",       // pending | paid | held | released | funding | active | depleted | refilled
  //   amount: "128.00",
  //   token: "USDC",
  //   mode: "instant",      // instant | escrow | metered
  //   tx: "0x4f2a…c91b"
  // }
}
```

### Minimisation des données

Ce qui transite par CNC Pay : adresse Bank, facture ID (fournie par le marchand), montant, token, mode, adresse wallet du client, `txHash` —
tout est déjà public on-chain, sauf la facture ID elle-même.

Ce que CNC Pay ne demande ni ne stocke jamais : nom, email, adresse de livraison, ou toute autre donnée personnelle du client.
Recommandation pour le marchand : ne pas mettre d'information identifiable dans la facture ID elle-même (par ex. un email plutôt qu'un
identifiant opaque type `order_8842`), puisqu'elle est transmise en clair et peut être journalisée.

### Schéma de configuration

Forme cible une fois qu'il y a un backend derrière la page Setup — aujourd'hui c'est de l'état local dans le mockup, rien n'est encore
persisté ni lu on-chain :

```json
{
  "bank": "0x8f21…4Ac9",
  "modes": {
    "instant": true,
    "escrow": true,
    "metered": false
  },
  "tokens": ["MATIC", "USDC", "USDT"]
}
```

`instant` est toujours `true` — c'est la seule valeur non modifiable du schéma, au même titre que le mode ne pouvant pas être désactivé dans
l'UI aujourd'hui.
