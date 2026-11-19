# Release signing

The release APK is signed with an upload key that lives outside the repo. The key and its passwords are never committed.

If the key settings are missing, the build still succeeds. It signs the release with the debug key and Gradle prints `ACL WARNING: upload keystore not configured`.

## 1. Create the key (owner, once)

```sh
mkdir -p ~/.android-keys && chmod 700 ~/.android-keys
keytool -genkeypair -v -keystore ~/.android-keys/alphacolorlab-upload.jks -alias alphacolorlab -keyalg RSA -keysize 4096 -validity 10000
```

keytool asks for the passwords and the name fields. Choose the passwords yourself. Use the same password for the keystore and the key.

## 2. Add the settings to `~/.gradle/gradle.properties`

```properties
ACL_UPLOAD_STORE_FILE=/home/<you>/.android-keys/alphacolorlab-upload.jks
ACL_UPLOAD_KEY_ALIAS=alphacolorlab
ACL_UPLOAD_STORE_PASSWORD=<store password>
ACL_UPLOAD_KEY_PASSWORD=<key password>
```

Use an absolute path for `ACL_UPLOAD_STORE_FILE`. Environment variables with the same names also work, for example in CI. The build reads them at Gradle time.

## 3. Back up the key

Back up `alphacolorlab-upload.jks` and both passwords somewhere off this machine, such as a password manager. Without this key you cannot ship an update that installs over the current build. Testers would have to uninstall and reinstall.

Do not commit the `.jks` file or `gradle.properties` to the repo.
