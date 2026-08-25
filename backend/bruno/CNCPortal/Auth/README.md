# Authentication Flow avec Bruno

Ce dossier contient une séquence complète d'authentification SIWE (Sign-In with Ethereum) qui démontre le chaînage de requêtes avec Bruno.

## Structure du Flow

### 1. **Auth - 1 - Get Nonce** (seq: 1)

- **Objectif**: Récupérer une nonce pour l'adresse de test
- **Variables produites**: `userNonce`, `nonce`
- **Endpoint**: `GET /user/nonce/{address}`

### 2. **Auth - 2 - Login with SIWE** (seq: 2)

- **Objectif**: Effectuer la connexion avec le message SIWE signé
- **Variables consommées**: `userNonce`, `testAddress`, `domain`, `chainId`
- **Variables produites**: `authToken`, `accessToken`
- **Endpoint**: `POST /auth/siwe`
- **Traitement**: Génère automatiquement le message SIWE et une signature mock

### 3. **Auth - 3 - Test Protected Route** (seq: 3)

- **Objectif**: Tester l'accès à une route protégée
- **Variables consommées**: `authToken`
- **Endpoint**: `GET /user/profile`
- **Auth**: Bearer token automatique

### 4. **Auth - 4 - Complete Auth Flow** (seq: 4)

- **Objectif**: Effectuer tout le flow en une seule requête (pour les tests automatisés)
- **Fonctionnalité**: Exécute les 3 étapes séquentiellement avec gestion d'erreur

### 5. **Auth - 5 - Validate Token** (seq: 5)

- **Objectif**: Valider un token d'authentification existant
- **Variables consommées**: `authToken`
- **Endpoint**: `GET /auth/token`
- **Auth**: Bearer token

### 6. **Auth - 6 - Invalid Token** (seq: 6)

- **Objectif**: Tester le comportement avec un token invalide
- **Endpoint**: `GET /auth/token`
- **Auth**: Bearer token invalide

### 7. **Auth - 7 - Missing Token** (seq: 7)

- **Objectif**: Tester le comportement sans token d'authentification
- **Endpoint**: `GET /auth/token`
- **Auth**: Aucune

## Variables d'Environnement

Configurées dans `environments/CNC URI.bru`:

```javascript
vars {
  host: http://localhost:3000/api
  testAddress: 0x1234567890123456789012345678901234567890
  domain: localhost:3000
  chainId: 1
}
```

## Utilisation

### Option 1: Exécution Séquentielle (Flow Principal)

1. Exécuter **Auth - 1 - Get Nonce**
2. Exécuter **Auth - 2 - Login with SIWE**
3. Exécuter **Auth - 3 - Test Protected Route**

### Option 2: Flow Automatisé

- Exécuter uniquement **Auth - 4 - Complete Auth Flow** qui fait tout automatiquement

### Option 3: Tests de Validation (après authentification)

4. Exécuter **Auth - 5 - Validate Token** (test avec token valide)
5. Exécuter **Auth - 6 - Invalid Token** (test avec token invalide)
6. Exécuter **Auth - 7 - Missing Token** (test sans token)

## Variables Partagées

Le chaînage utilise ces variables Bruno:

- `userNonce`: Nonce récupérée à l'étape 1
- `siweMessage`: Message SIWE généré automatiquement
- `siweSignature`: Signature mock pour les tests
- `authToken`: Token JWT pour l'authentification
- `accessToken`: Alias du token (stocké via vars:post-response)

## Fonctionnalités Avancées

### Pre-request Scripts

- Génération automatique du message SIWE conforme au standard
- Validation des variables requises
- Logging détaillé pour le debugging

### Post-response Processing

- Extraction automatique des tokens
- Stockage des variables pour la requête suivante
- Validation des réponses

### Tests Intégrés

- Vérification des codes de statut
- Validation de la structure des réponses
- Tests de bout en bout avec gestion d'erreur

## Debugging

Tous les scripts incluent du logging console détaillé:

```javascript
console.log("Nonce captured:", res.body.nonce);
console.log("SIWE message created");
console.log("Access token captured for authenticated requests");
```

## Signature Mock

Pour les tests, une signature Ethereum mock est utilisée:

```javascript
const mockSignature = "0x" + "a1b2c3d4e5f6".repeat(21) + "1b";
```

En production, cette signature viendrait d'un wallet réel.

## Adaptation pour Production

Pour utiliser avec de vraies signatures:

1. Remplacer la signature mock par une intégration wallet
2. Ajuster l'adresse de test dans les variables d'environnement
3. Configurer le bon endpoint d'API

## Structure Technique

Le chaînage utilise:

- **vars:post-response**: Pour capturer automatiquement les réponses
- **bru.setVar()**: Pour stocker des variables calculées
- **bru.getVar()**: Pour récupérer des variables précédentes
- **pre-request scripts**: Pour la préparation des données
- **tests scripts**: Pour la validation et le traitement post-réponse
