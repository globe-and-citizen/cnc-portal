/**
 * Google Cloud Storage Configuration
 * 
 * DEPRECATED: This file is kept for backwards compatibility only.
 * New file uploads should use ClaimAttachment model to store files directly in the database.
 * 
 * To re-enable cloud storage:
 * 1. Uncomment the code below
 * 2. Set GCS_BUCKET_NAME and GCP_KEY environment variables
 * 3. Update upload routes to use uploadImageToGCS
 */

// import { config } from 'dotenv';
// import { Storage } from '@google-cloud/storage';

// // Charge les variables d'environnement depuis le fichier .env
// config();

// let storage: Storage;

// if (process.env.GCP_KEY) {
//   // Railway: use JSON from env
//   const credentials = JSON.parse(process.env.GCP_KEY);
//   storage = new Storage({ credentials });
// } else {
//   // Local: fallback to GOOGLE_APPLICATION_CREDENTIALS file
//   storage = new Storage();
// }

// // Référence au bucket (nom exact à définir dans .env)
// const bucketName = process.env.GCS_BUCKET_NAME;

// if (!bucketName) {
//   throw new Error('La variable GCS_BUCKET_NAME est manquante dans le fichier .env');
// }

// const bucket = storage.bucket(bucketName);

// export { bucket };

// Placeholder export to prevent import errors
export const bucket = null;
