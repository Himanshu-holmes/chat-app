// this.symmetricKeys are in like { [username]:symmetricKey}
// Enhanced CryptoService.js using libsodium for deterministic key generation
import sodium from "libsodium-wrappers-sumo";
import apiService from "./axiosService";

 class CryptoService {
  constructor() {
    this.keyPair = null;
    this.publicKeyJwk = null;
    this.privateKeyJwk = null;
    this.symmetricKeys = {}; // Store symmetric keys for each conversation
    this.salt = null; // Salt for key derivation
    this.isInitialized = false;
  }

  // Initialize libsodium
  async initialize() {
    console.log("isInitialised",this.isInitialized)
    if (!this.isInitialized) {
      await sodium.ready;
      this.isInitialized = true;
      console.log("initialised true");
      console.log("Sodium initialized");
      console.log("SALTBYTES:", sodium.crypto_pwhash_SALTBYTES); // should log: 16
    }
  }

  // Generate a random salt
  async generateSalt() {
    await this.initialize();
     const pwhashSaltByte = sodium.crypto_pwhash_SALTBYTES;
     console.log("pwhassaltbyte",pwhashSaltByte)
    this.salt = sodium.randombytes_buf(pwhashSaltByte);
    return this.salt;
  }

  // Import an existing salt
  setSalt(salt) {
    this.salt = new Uint8Array(salt);
  }

  // Derive keys from password using libsodium's pwhash
  async deriveKeysFromPassword({password,isRegistering}) {
    await this.initialize();
    console.log("salt",this.salt)
    if(!isRegistering){
      // see if salt exist in db
      // const getSaltRes = await apiService.get("user/salt");
      // console.log("get salt result",getSaltRes)
    }
    // If no salt exists, generate one
    if (!this.salt) {

      await this.generateSalt();
    }

    try {
      // Use libsodium's key derivation function which is designed for password hashing and key derivation
      // This is more secure than PBKDF2 for this purpose
      const seed = sodium.crypto_pwhash(
        64, // Output length in bytes (512 bits)
        password,
        this.salt,
        sodium.crypto_pwhash_OPSLIMIT_SENSITIVE, // High computational cost for security
        sodium.crypto_pwhash_MEMLIMIT_SENSITIVE, // High memory usage for security
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      return {
        seed,
        salt: Array.from(this.salt), // Convert to array for storage
      };
    } catch (error) {
      console.error("Error deriving keys from password:", error);
      throw error;
    }
  }

  // Generate deterministic keypair from seed using libsodium
  async generateDeterministicKeyPair(seed) {
    await this.initialize();

    try {
      // Use libsodium's deterministic key generation
      // Generate a deterministic Ed25519 keypair first
      const edKeyPair = sodium.crypto_sign_seed_keypair(seed.slice(0, 32));

      // Convert the Ed25519 keys to curve25519 (X25519) for encryption/decryption
      const publicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(
        edKeyPair.publicKey
      );
      const privateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(
        edKeyPair.privateKey
      );

      // Store keys in raw format
      this.keyPair = {
        publicKey,
        privateKey,
      };

      // Convert to JWK format for interoperability
      // Note: This is a simplified conversion. In production, you'd need more complete JWK conversion
      this.publicKeyJwk = {
        kty: "OKP", // Octet Key Pair
        crv: "X25519", // Curve25519
        x: sodium.to_base64(
          publicKey,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        key_ops: ["encrypt"],
        ext: true,
      };

      this.privateKeyJwk = {
        kty: "OKP",
        crv: "X25519",
        x: sodium.to_base64(
          publicKey,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        d: sodium.to_base64(
          privateKey,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        key_ops: ["decrypt"],
        ext: true,
      };

      return this.publicKeyJwk;
    } catch (error) {
      console.error("Error generating deterministic key pair:", error.message);
      // throw error;
    }
  }

  // Encrypt private key with a password for storage
  async encryptPrivateKey(password) {
    await this.initialize();

    try {
      // Generate a random nonce
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      // Derive a key from the password
      const key = sodium.crypto_pwhash(
        sodium.crypto_secretbox_KEYBYTES,
        password,
        this.salt,
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      // Convert private key JWK to string
      const privateKeyString = JSON.stringify(this.privateKeyJwk);

      // Encrypt the private key using libsodium's secretbox
      const encryptedPrivateKey = sodium.crypto_secretbox_easy(
        privateKeyString,
        nonce,
        key
      );

      // Return encrypted key with nonce for storage
      return {
        encryptedKey: Array.from(encryptedPrivateKey),
        nonce: Array.from(nonce),
      };
    } catch (error) {
      console.error("Error encrypting private key:", error);
      throw error;
    }
  }

  // Decrypt stored private key
  async decryptPrivateKey(encryptedData, password, salt) {
    await this.initialize();

    // Set the salt
    this.setSalt(salt);

    try {
      // Derive the same key used for encryption
      const key = sodium.crypto_pwhash(
        sodium.crypto_secretbox_KEYBYTES,
        password,
        this.salt,
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      // Decrypt the private key
      const nonce = new Uint8Array(encryptedData.nonce);
      const encryptedKey = new Uint8Array(encryptedData.encryptedKey);

      const decryptedString = sodium.crypto_secretbox_open_easy(
        encryptedKey,
        nonce,
        key
      );

      // Parse the decrypted string back to JWK
      const privateKeyString = sodium.to_string(decryptedString);
      this.privateKeyJwk = JSON.parse(privateKeyString);

      // Reconstruct the key pair
      const privateKey = sodium.from_base64(
        this.privateKeyJwk.d,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );

      const publicKey = sodium.from_base64(
        this.privateKeyJwk.x,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );

      this.keyPair = {
        publicKey,
        privateKey,
      };

      this.publicKeyJwk = {
        kty: "OKP",
        crv: "X25519",
        x: this.privateKeyJwk.x,
        key_ops: ["encrypt"],
        ext: true,
      };

      return this.privateKeyJwk;
    } catch (error) {
      console.error("Error decrypting private key:", error);
      throw new Error("Invalid password or corrupted key");
    }
  }

  // Store user credentials in localStorage
  storeUserData(username, encryptedPrivateKey, publicKeyJwk, salt) {
    const userData = {
      username,
      encryptedPrivateKey,
      publicKeyJwk,
      salt,
    };

    try {
      localStorage.setItem("chatUserData", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("Error storing user data:", error);
      return false;
    }
  }

  // Retrieve user data from localStorage
  getUserData() {
    try {
      const userData = localStorage.getItem("chatUserData");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error retrieving user data:", error);
      return null;
    }
  }

  // Clear user data from localStorage
  clearUserData() {
    try {
      localStorage.removeItem("chatUserData");
      return true;
    } catch (error) {
      console.error("Error clearing user data:", error);
      return false;
    }
  }

  // Create a symmetric key for secure communication with a recipient
  async createSymmetricKey(recipient) {
    await this.initialize();

    try {
      // Generate a random key using libsodium
      const symmetricKey = sodium.crypto_secretbox_keygen();

      this.symmetricKeys[recipient] = symmetricKey;

      return symmetricKey;
    } catch (error) {
      console.error("Error creating symmetric key:", error);
      throw error;
    }
  }

  // Encrypt a symmetric key with recipient's public key
  async encryptSymmetricKey(symmetricKey, recipientPublicKeyJwk) {
    await this.initialize();

    try {
      // Convert JWK to raw key format
      const recipientPublicKey = sodium.from_base64(
        recipientPublicKeyJwk.x,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );

      // Generate an ephemeral keypair for the encryption
      const ephemeralKeyPair = sodium.crypto_box_keypair();

      // Encrypt the symmetric key using libsodium's sealed box
      // This combines the recipient's public key with an ephemeral key
      const encryptedKey = sodium.crypto_box_seal(
        symmetricKey,
        recipientPublicKey
      );

      return {
        encryptedKey: Array.from(encryptedKey),
      };
    } catch (error) {
      console.error("Error encrypting symmetric key:", error);
      throw error;
    }
  }

  // Decrypt a symmetric key with our private key
  async decryptSymmetricKey(encryptedSymmetricKey) {
    await this.initialize();

    try {
      console.log("this.keyPair", this.keyPair);
      if (!this.keyPair || !this.keyPair.privateKey) {
        throw new Error("Private key not available");
      }

      const encryptedKey = new Uint8Array(encryptedSymmetricKey.encryptedKey);
      console.log("encryptedKey", encryptedKey);

      // Decrypt the symmetric key using our private key
      const symmetricKey = sodium.crypto_box_seal_open(
        encryptedKey,
        this.keyPair.publicKey,
        this.keyPair.privateKey
      );

      return symmetricKey;
    } catch (error) {
      console.error("Error decrypting symmetric key:", error);
      throw error;
    }
  }

  // Import a symmetric key for a specific sender
  async importSymmetricKey(keyData, sender) {
    await this.initialize();

    try {
      const symmetricKey = new Uint8Array(keyData);
      this.symmetricKeys[sender] = symmetricKey;
      return true;
    } catch (error) {
      console.error("Error importing symmetric key:", error);
      throw error;
    }
  }

  // Encrypt a message using the symmetric key for the recipient
  async encryptMessage(message, reciever,currentUser) {
    await this.initialize();

    try {
      const recipient = reciever?.username
      let symmetricKey = this.symmetricKeys[recipient];
      if (!symmetricKey) {
        const getSmKeyRes = await apiService.get("/message/sm-key", {
          params: {
            senderId: reciever?.id,
            recipientId: currentUser?.id,
          },
        });
        const encryptedSymKey = getSmKeyRes.data?.symKey;
        console.log("encryptedSymKey got from db",encryptedSymKey)
        if(encryptedSymKey){
          let decryptSymKey = await cryptoService.decryptSymmetricKey(encryptedSymKey)
          console.log("decryptedSymKey",decryptSymKey)
          symmetricKey = decryptSymKey;
          this.symmetricKeys[recipient] = decryptSymKey
        }
      }

      // Generate a random nonce
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      // Encrypt the message
      const messageData = sodium.from_string(message);
      const encryptedMessage = sodium.crypto_secretbox_easy(
        messageData,
        nonce,
        symmetricKey
      );

      const result = {
        nonce: Array.from(nonce),
        data: Array.from(encryptedMessage),
      };

      return result;
    } catch (error) {
      console.error("Error encrypting message:", error);
      throw error;
    }
  }

  // Decrypt a message using the symmetric key for the sender
  async decryptMessage(encryptedObj, senderData,currentUser) {
    console.log("decryptMessage: sender data ",senderData)
    console.log("decryptMessage: currentUser ",currentUser)
    await this.initialize();
    console.log("crypto:senderData", senderData);
    try {
      const sender = senderData?.username
      let symmetricKey = this.symmetricKeys[sender];
      if (!symmetricKey) {
         const getSmKeyRes = await apiService.get("/message/sm-key", {
           params: {
             recipientId: currentUser?.id,
             senderId: senderData?.id,
           },
         });
         const encryptedSymKey = getSmKeyRes.data?.symKey;
         console.log("encryptedSymKey got from db", encryptedSymKey);
         if (encryptedSymKey) {
           let decryptSymKey = await cryptoService.decryptSymmetricKey(
             encryptedSymKey
           );
           console.log("decryptedSymKey", decryptSymKey);
           symmetricKey = decryptSymKey;
           this.symmetricKeys[sender] = decryptSymKey;
         }
       
      }

      const nonce = new Uint8Array(encryptedObj.nonce);
      const encryptedData = new Uint8Array(encryptedObj.data);

      // Decrypt the message
      const decryptedData = sodium.crypto_secretbox_open_easy(
        encryptedData,
        nonce,
        symmetricKey
      );

      return sodium.to_string(decryptedData);
    } catch (error) {
      console.error("Error decrypting message:", error);
      throw new Error(
        "Failed to decrypt message. It may be corrupted or tampered with."
      );
    }
  }
}

export const cryptoService = new CryptoService()
cryptoService.initialize()