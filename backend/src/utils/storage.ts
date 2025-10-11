import { config } from 'dotenv';
import { Storage } from '@google-cloud/storage';

// Charge les variables d'environnement depuis le fichier .env
config();

let storage: Storage;

if (process.env.GCP_KEY) {
  // Railway: use JSON from env
  const credentials = JSON.parse(process.env.GCP_KEY);
  storage = new Storage({ credentials });
} else {
  // Local: fallback to GOOGLE_APPLICATION_CREDENTIALS file
  storage = new Storage();
}

// Référence au bucket (nom exact à définir dans .env)
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('La variable GCS_BUCKET_NAME est manquante dans le fichier .env');
}

const bucket = storage.bucket(bucketName);

export { bucket };
