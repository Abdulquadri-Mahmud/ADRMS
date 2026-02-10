const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function migrateFinancialRecords() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('MONGODB_URI is not defined in .env file');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();
        const collection = db.collection('FinancialRecord');

        // Count records to be updated
        const count = await collection.countDocuments({ type: 'PURCHASE' });
        console.log(`Found ${count} records with type 'PURCHASE'`);

        if (count > 0) {
            const result = await collection.updateMany(
                { type: 'PURCHASE' },
                { $set: { type: 'EXPENSE' } }
            );
            console.log(`Successfully migrated ${result.modifiedCount} records to 'EXPENSE'`);
        } else {
            console.log('No migration needed.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

migrateFinancialRecords();
