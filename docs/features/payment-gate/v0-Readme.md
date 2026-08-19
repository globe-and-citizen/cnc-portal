# Payment Gate — v0 (Version allégée)

Version allégée du [Readme](./Readme.md) complet, limitée à ce dont le v0 a réellement besoin
pour être livré. Juste le branchement d'un widget embarquable sur l'existant.

## Description de la fonctionnalité

CNC Pay permet à un marchand — ici appelé **Layer8** — d'intégrer un widget sur sa propre page
pour que ses clients puissent le payer directement. Layer8 doit avoir un compte CNC ; les
paiements atterrissent directement sur la Bank existante de son équipe.

Le rôle de CNC Pay s'arrête à la collecte du paiement : on reçoit un montant Y et une facture ID
Z, et on facture Y pour Z. Ce que Z représente ne nous regarde pas — c'est à Layer8 de le définir
et de l'interpréter. Cette base suffit déjà à faire fonctionner aussi bien le **Pay now** que le
**Pay as you go** ; à Layer8 de décider comment s'en servir, par exemple ce qu'une facture ID
représente pour un usage pay-as-you-go.

### Flux de paiement (v0)

1. Un client déclenche un paiement sur la page de Layer8 — par exemple un usage sous un plan
   pay-as-you-go. Layer8 connaît déjà le montant et affiche la facture au client.
2. Layer8 monte le widget pour cette facture — montant + facture ID.
3. Le widget affiche un récapitulatif du paiement : montant et facture ID.
4. Le client paie.
5. Le widget affiche la conclusion de la transaction.

---

## Aperçu des statuts

| User Story        | Titre                              | Acteur   |     Statut      | Priorité | Effort |
| ------------------ | ----------------------------------- | -------- | :--------------: | :------: | ------ |
| US-PAYGATE-V0-001  | Configurer le widget                | Marchand |  🔲 Pas commencé  |    P1    | S      |
| US-PAYGATE-V0-002  | Intégrer le widget sur la page du marchand | Marchand |  🔲 Pas commencé  |    P1    | M      |
| US-PAYGATE-V0-003  | Payer via le widget                 | Client de Layer8 |  🔲 Pas commencé  |    P1    | L      |
| US-PAYGATE-V0-004  | Historique des paiements            | Marchand |  🔲 Pas commencé  |    P2    | M      |
| US-PAYGATE-V0-005  | Recall (Recheck) le statut d'un paiement | Marchand |  🔲 Pas commencé  |    P2    | M      |

---

## US-PAYGATE-V0-001 : Configurer le widget

**En tant que** marchand **je veux** configurer le widget **afin qu'**il corresponde à mon
intégration

**Critères d'acceptation :**

- [ ] Le marchand configure le widget en spécifiant le token accepté (USDC, USDCe, POL)
- [ ] Un aperçu du widget montre l'emplacement des éléments configurés (montant, token sélectionné)
- [ ] Le token est le seul élément configurable par le marchand — style et disposition ne sont pas
      modifiables en v0

**Priorité :** P1 (Critique) · **Effort :** S · **Statut :** 🔲 Pas commencé · **Dépendances :** —

---

## US-PAYGATE-V0-002 : Intégrer le widget sur la page du marchand

**En tant que** marchand (Layer8) **je veux** insérer un script sur ma propre page **afin que**
mes clients puissent me payer directement

**Critères d'acceptation :**

- [ ] Le marchand dispose d'un compte CNC, et les paiements atterrissent sur la Bank de son équipe
- [ ] Le script embarque le widget sur la page du marchand, avec l'adresse Bank et le token
      configuré (US-PAYGATE-V0-001)
- [ ] Pour une commande précise, le marchand passe au widget la facture ID correspondante

**Priorité :** P1 (Critique) · **Effort :** M · **Statut :** 🔲 Pas commencé · **Dépendances :**
US-PAYGATE-V0-001

---

## US-PAYGATE-V0-003 : Payer via le widget

**En tant que** client de Layer8 **je veux** payer directement depuis le widget **afin de** régler
ma facture sans quitter la page du marchand

**Critères d'acceptation :**

- [ ] Le widget affiche un récapitulatif du paiement : montant et facture ID
- [ ] Le client paie ce montant pour cette facture ID — le widget ne distingue pas Pay now de Pay
      as you go, c'est à Layer8 d'interpréter la facture ID
- [ ] Le widget affiche la conclusion de la transaction (en cours/succès/échec)
- [ ] Une fois la transaction diffusée, le widget rapporte le `txHash` avec la facture ID à CNC
      Pay — c'est cet enregistrement qui alimente l'historique (US-PAYGATE-V0-004)

**Priorité :** P1 (Critique) · **Effort :** L · **Statut :** 🔲 Pas commencé · **Dépendances :**
US-PAYGATE-V0-002

---

## US-PAYGATE-V0-004 : Historique des paiements

**En tant que** marchand **je veux** consulter l'historique des paiements effectués via le widget
**afin de** suivre ce que mes clients ont payé

**Critères d'acceptation :**

- [ ] Le marchand peut consulter la liste des paiements passés par le widget
- [ ] Chaque entrée montre au minimum le montant, la facture ID et le statut

**Priorité :** P2 (Haute) · **Effort :** M · **Statut :** 🔲 Pas commencé · **Dépendances :**
US-PAYGATE-V0-003

---

## US-PAYGATE-V0-005 : Recall (Recheck) le statut d'un paiement

**En tant que** marchand **je veux** redemander à CNC Pay le statut d'un paiement par facture ID
**afin de** retrouver ce paiement si je n'ai pas pu enregistrer son statut moi-même au moment du
paiement

**Critères d'acceptation :**

- [ ] Le marchand peut demander le statut d'une facture ID directement à CNC Pay (fallback,
      pas le chemin par défaut)
- [ ] Cette vérification ne fonctionne que si le `txHash` a été enregistré au préalable
      (US-PAYGATE-V0-003) — sans lui, rien ne relie la facture ID à une transaction

**Priorité :** P2 (Haute) · **Effort :** M · **Statut :** 🔲 Pas commencé · **Dépendances :**
US-PAYGATE-V0-003

---

## Cas limites (à discuter en équipe)

Pas encore tranchés — à passer en revue avant de considérer le v0 complet.

| Cas | Description | Ce qu'il faut décider | Proposition |
| --- | --- | --- | --- |
| Facture ID manquante ou vide | Le marchand monte le widget sans `data-facture-id` | Le widget doit-il refuser de s'afficher, ou afficher une erreur explicite ? | Afficher une erreur explicite, ex. : *"Configuration invalide : aucune facture ID fournie."* |
| Token non configuré | Le marchand n'a pas encore choisi de token sur le widget | Y a-t-il un token par défaut, ou le widget reste bloqué tant que rien n'est configuré ? | Token par défaut : USDC |
| Client ferme la page pendant la transaction | Le paiement est en cours (`en cours`) quand le client quitte ou recharge la page | Le marchand a-t-il un moyen de retrouver le statut réel après coup, ou le paiement est-il juste perdu de vue ? | Oui, via un endpoint. Deux options : une fonction de contrat qui prend la facture ID et le montant, ou l'enregistrement du `txHash` directement en base dès la validation dans MetaMask |
| Transaction échoue on-chain (revert) | Le paiement passe de "en cours" à "échec" | Le widget affiche-t-il la raison de l'échec, ou juste "échec" sans détail ? | Afficher la raison, reformulée pour rester compréhensible par un humain |
| Double soumission | Le client clique deux fois sur payer, ou rouvre le widget pour la même facture ID | Rien n'empêche aujourd'hui un double paiement pour la même facture ID | Le loader est censé empêcher le double-clic. Reste ouvert : comment gérer un doublon de facture ID (le widget rouvert sur une facture déjà payée) |
| Montant à zéro ou négatif | Erreur de configuration côté marchand | Le widget doit-il valider le montant avant d'afficher quoi que ce soit ? | Oui, valider, et afficher un warning sur le widget |
| Le rapport du `txHash` n'arrive jamais à CNC Pay | Le client ferme la page, ou le réseau coupe, entre la diffusion de la transaction et le rapport du `txHash` (US-PAYGATE-V0-003) | Sans ce rapport, rien ne lie la facture ID à la transaction — comment le marchand retrouve-t-il ce paiement dans l'historique (US-PAYGATE-V0-004) ? | — |
| Le `txHash` n'a jamais été enregistré nulle part | Ni CNC Pay ni le marchand n'ont de trace du lien facture ID ↔ transaction (Recall de US-PAYGATE-V0-005 impossible) | Deux options à trancher : une fonction de contrat qui prend la facture ID en paramètre (traçable on-chain), ou un enregistrement en base de données côté CNC Pay | Même décision que ci-dessus : une fonction de contrat qui prend la facture ID et le montant, ou l'enregistrement du `txHash` directement en base dès la validation dans MetaMask |

---

_[← Retour au flux de paiement et cas limites](./flow-and-edge-cases.md)_ ·
_[User stories complètes](./Readme.md)_
