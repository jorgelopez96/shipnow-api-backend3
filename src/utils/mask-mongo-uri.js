const MONGO_CREDENTIALS = /(mongodb(?:\+srv)?:\/\/)([^:@/\s]+):([^@/\s]+)@/gi;

export const maskMongoUri = (text) => text.replace(MONGO_CREDENTIALS, '$1$2:****@');
