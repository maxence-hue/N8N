# ADSolar Chat (Next.js + n8n)

Interface de chat opérateur ADSolar construite avec Next.js 14, Tailwind CSS et un backend n8n via webhooks.

## Démarrage rapide

```bash
npm install
cp .env.example .env.local
npm run dev
```

Un script `postinstall` génère automatiquement l'icône PWA (`public/icon-512.png`) à partir de `pngjs` afin d'éviter de versionner des binaires.

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `N8N_OUTBOUND_WEBHOOK` | URL du webhook n8n recevant les messages sortants. |
| `N8N_SHARED_SECRET` | Secret HMAC partagé pour signer et vérifier les requêtes (header `X-ADSolar-Signature`). |
| `BASE_URL` | URL publique de l'application (utilisée si besoin pour des callbacks). |
| `MAX_UPLOAD_MB` | Limite de taille par fichier côté serveur (Mo). |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | Limite affichée côté client (Mo). |

## Fonctionnalités clés

- Chat en temps réel (Server-Sent Events) entre l'opérateur et n8n.
- Envoi de messages texte et pièces jointes (PDF/DOC/DOCX/CSV/JPG/PNG/HEIC) avec drag & drop ou sélection mobile.
- Prévisualisation des images et métadonnées de fichiers.
- Upload sécurisé (validation extension/MIME, limite de taille, stub antivirus).
- Signature HMAC SHA256 des appels vers n8n et vérification entrante.
- Rate limiting IP (60 requêtes/minute).
- PWA installable (manifest + service worker + page offline).
- Accessibilité soignée (ARIA, focus visible, navigation clavier).
- Identifiant de conversation persisté (cookie + localStorage) pour reprendre le fil après rafraîchissement.

## Intégration n8n

### Webhook sortant (app → n8n)

Les messages sont relayés via `POST /api/chat/send` qui les transmet ensuite au webhook configuré dans `N8N_OUTBOUND_WEBHOOK` avec le schéma :

```json
{
  "conversationId": "<uuid>",
  "messages": [
    {
      "id": "<uuid>",
      "role": "user",
      "type": "text|image|file",
      "text": "...",
      "fileUrl": "https://...",
      "fileName": "...",
      "fileSize": 12345,
      "mimeType": "application/pdf",
      "createdAt": "2025-10-06T13:00:00Z"
    }
  ]
}
```

La requête est signée avec `X-ADSolar-Signature: sha256=<HMAC>`.

### Historique de conversation

- `GET /api/chat/history?conversationId=<uuid>` : retourne les messages persistés en mémoire pour initialiser le chat côté client.

### Webhook entrant (n8n → app)

Exposez `POST ${BASE_URL}/api/webhooks/n8n-incoming` dans votre workflow n8n. Exemple de cURL pour simuler une réponse :

```bash
body='{"conversationId":"<uuid>","messages":[{"id":"m-1","role":"assistant","type":"text","text":"Bonjour !","createdAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}]}'
signature=$(node -e "const crypto=require('crypto');const secret=process.env.N8N_SHARED_SECRET;const body=process.argv[1];const sig='sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex');console.log(sig);" "$body")
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-ADSolar-Signature: $signature" \
  -d "$body" \
  http://localhost:3000/api/webhooks/n8n-incoming
```

La réponse apparaîtra en temps réel dans l'interface grâce au flux SSE `/api/events`.

## Tests

```bash
npm run test
```

## Limites et TODO

- Stockage messages & fichiers en mémoire / disque local : migrer vers Redis + S3 en production.
- Répertoire `public/uploads` exposé pour les prévisualisations : le remplacer par un stockage objet sécurisé.
- Authentification minimale : ajouter une vraie gestion d'identité opérateur.
- Antivirus : intégrer un vrai moteur (ClamAV, VirusTotal API, etc.).
- Monitoring SSE/WebSocket : mettre en place un superviseur pour reconnexions avancées.

## Licence

Projet de démonstration interne ADSolar.
