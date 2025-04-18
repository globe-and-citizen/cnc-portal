import { config } from 'dotenv';
import { Storage } from '@google-cloud/storage';

// Charge les variables d'environnement depuis le fichier .env
config();

// Initialise le client Storage (les credentials sont lus via la variable d'env GOOGLE_APPLICATION_CREDENTIALS)
const storage = new Storage();

// Référence au bucket (nom exact à définir dans .env)
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('La variable GCS_BUCKET_NAME est manquante dans le fichier .env');
}

const bucket = storage.bucket(bucketName);

export { bucket };
