package com.certbridge.x509;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import javax.security.auth.x500.X500Principal;

/**
 * Minimal openssl-compatible x509 helper for CertBridge Lite.
 * Supports the subset used by module shell scripts.
 */
public final class Main {
  private Main() {}

  public static void main(String[] args) throws Exception {
    if (args == null || args.length == 0) {
      System.exit(1);
    }
    if ("version".equals(args[0])) {
      System.out.println("cbx509 1.1.3 (CertBridge Lite)");
      return;
    }
    if (!"x509".equals(args[0])) {
      System.err.println("only x509 / version supported");
      System.exit(1);
    }

    String inPath = null;
    String outPath = null;
    String inform = "PEM";
    boolean noout = false;
    boolean wantSubject = false;
    boolean wantIssuer = false;
    boolean wantStart = false;
    boolean wantEnd = false;
    boolean wantHashOld = false;
    boolean wantFpSha256 = false;
    boolean wantFpSha1 = false;
    boolean wantSerial = false;
    boolean wantDump = false;
    boolean wantText = false;
    boolean checkEnd = false;
    long checkEndSeconds = 0;
    String nameopt = "";

    for (int i = 1; i < args.length; i++) {
      String a = args[i];
      if ("-in".equals(a) && i + 1 < args.length) {
        inPath = args[++i];
      } else if ("-out".equals(a) && i + 1 < args.length) {
        outPath = args[++i];
      } else if ("-inform".equals(a) && i + 1 < args.length) {
        inform = args[++i].toUpperCase(Locale.US);
      } else if ("-noout".equals(a)) {
        noout = true;
      } else if ("-subject".equals(a)) {
        wantSubject = true;
      } else if ("-issuer".equals(a)) {
        wantIssuer = true;
      } else if ("-startdate".equals(a)) {
        wantStart = true;
      } else if ("-enddate".equals(a)) {
        wantEnd = true;
      } else if ("-subject_hash_old".equals(a)) {
        wantHashOld = true;
      } else if ("-fingerprint".equals(a)) {
        // next may be -sha256
      } else if ("-sha256".equals(a)) {
        wantFpSha256 = true;
      } else if ("-sha1".equals(a)) {
        wantFpSha1 = true;
      } else if ("-serial".equals(a)) {
        wantSerial = true;
      } else if ("-certbridge_info".equals(a)) {
        wantDump = true;
      } else if ("-text".equals(a)) {
        wantText = true;
      } else if ("-checkend".equals(a) && i + 1 < args.length) {
        checkEnd = true;
        checkEndSeconds = Long.parseLong(args[++i]);
      } else if ("-nameopt".equals(a) && i + 1 < args.length) {
        nameopt = args[++i];
      } else if ("-outform".equals(a) && i + 1 < args.length) {
        i++; // ignore, always write PEM
      }
    }

    if (inPath == null) {
      System.err.println("missing -in");
      System.exit(1);
    }

    byte[] fileBytes = readAll(inPath);
    X509Certificate cert;
    try {
      cert = parseCert(fileBytes, inform);
    } catch (Exception e) {
      if ("PEM".equals(inform)) {
        cert = parseCert(fileBytes, "DER");
      } else {
        throw e;
      }
    }

    if (checkEnd) {
      long limit = System.currentTimeMillis() + checkEndSeconds * 1000L;
      if (cert.getNotAfter().getTime() <= limit) {
        System.exit(1);
      }
      System.exit(0);
    }

    if (wantDump) {
      dumpInfo(cert);
      return;
    }
    if (wantHashOld) {
      System.out.println(subjectHashOld(cert));
    }
    if (wantSubject) {
      System.out.println("subject=" + formatName(cert.getSubjectX500Principal(), nameopt));
    }
    if (wantIssuer) {
      System.out.println("issuer=" + formatName(cert.getIssuerX500Principal(), nameopt));
    }
    if (wantStart) {
      System.out.println("notBefore=" + formatOpenSslDate(cert.getNotBefore()));
    }
    if (wantEnd) {
      System.out.println("notAfter=" + formatOpenSslDate(cert.getNotAfter()));
    }
    if (wantSerial) {
      System.out.println("serial=" + cert.getSerialNumber().toString(16).toUpperCase(Locale.US));
    }
    if (wantFpSha256) {
      System.out.println("sha256 Fingerprint=" + colonHex(shaDigest(cert.getEncoded(), "SHA-256")));
    }
    if (wantFpSha1) {
      System.out.println("SHA1 Fingerprint=" + colonHex(shaDigest(cert.getEncoded(), "SHA-1")));
    }
    if (wantText) {
      // Enough for shell scripts that grep CA:TRUE
      if (cert.getBasicConstraints() >= 0) {
        System.out.println("CA:TRUE");
      } else {
        System.out.println("CA:FALSE");
      }
      System.out.println("Subject: " + cert.getSubjectX500Principal().getName());
      System.out.println("Issuer: " + cert.getIssuerX500Principal().getName());
    }

    if (outPath != null) {
      writePem(outPath, cert.getEncoded());
    } else if (!noout
        && !wantHashOld
        && !wantSubject
        && !wantIssuer
        && !wantStart
        && !wantEnd
        && !wantFpSha256
        && !wantFpSha1
        && !wantSerial
        && !wantDump
        && !wantText) {
      // openssl x509 -in f -noout  → validate only
      // openssl x509 -in f → print PEM; we only hit this if -noout absent and no other flags
      writePemStream(System.out, cert.getEncoded());
    }
  }

  private static X509Certificate parseCert(byte[] data, String inform) throws Exception {
    CertificateFactory cf = CertificateFactory.getInstance("X.509");
    if (!"DER".equals(inform)) {
      byte[] pemDer = extractPemDer(data);
      if (pemDer != null) {
        return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(pemDer));
      }
    }
    try {
      return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(data));
    } catch (Exception e) {
      if ("DER".equals(inform)) throw e;
      byte[] pemDer = extractPemDer(data);
      if (pemDer != null) {
        return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(pemDer));
      }
      throw e;
    }
  }

  /** PEM（含 TRUSTED CERTIFICATE / 前后杂质）→ DER；不是 PEM 则返回 null。 */
  private static byte[] extractPemDer(byte[] data) {
    String text = new String(data, StandardCharsets.ISO_8859_1);
    if (text.length() > 0 && text.charAt(0) == '\ufeff') {
      text = text.substring(1);
    }
    int begin = indexOfIgnoreCase(text, "-----BEGIN ");
    if (begin < 0) return null;
    int headerEnd = text.indexOf('\n', begin);
    if (headerEnd < 0) return null;
    String header = text.substring(begin, headerEnd).toUpperCase(Locale.US);
    if (header.indexOf("CERTIFICATE") < 0) return null;
    int end = indexOfIgnoreCase(text, "-----END ", headerEnd);
    if (end < 0) return null;
    String b64 = text.substring(headerEnd + 1, end).replaceAll("[^A-Za-z0-9+/=]", "");
    if (b64.length() < 64) return null;
    try {
      return Base64.decode(b64);
    } catch (Exception e) {
      return null;
    }
  }

  private static int indexOfIgnoreCase(String hay, String needle) {
    return indexOfIgnoreCase(hay, needle, 0);
  }

  private static int indexOfIgnoreCase(String hay, String needle, int from) {
    String h = hay.toUpperCase(Locale.US);
    String n = needle.toUpperCase(Locale.US);
    return h.indexOf(n, from);
  }

  private static void dumpInfo(X509Certificate cert) throws Exception {
    kv("ok", "1");
    kv("version", String.valueOf(cert.getVersion()));
    kv("serial", cert.getSerialNumber().toString(16).toUpperCase(Locale.US));
    kv("sig_alg", cert.getSigAlgName());
    PublicKey pk = cert.getPublicKey();
    if (pk != null) {
      kv("pubkey_alg", pk.getAlgorithm());
      int bits = pubkeyBits(pk);
      if (bits > 0) kv("pubkey_bits", String.valueOf(bits));
    }
    int bc = cert.getBasicConstraints();
    kv("ca", bc >= 0 ? "1" : "0");
    if (bc >= 0 && bc < Integer.MAX_VALUE) kv("pathlen", String.valueOf(bc));
    kv("key_usage", formatKeyUsage(cert.getKeyUsage()));
    kv("ext_key_usage", formatEku(cert));
    kv("san", formatSan(cert));
    kv("ski", extensionKeyId(cert, "192.168.1.5", true));
    kv("aki", extensionKeyId(cert, "10.0.1.2", false));
    String subject = cert.getSubjectX500Principal().getName();
    String issuer = cert.getIssuerX500Principal().getName();
    kv("subject", subject);
    kv("issuer", issuer);
    kv("self_signed", subject.equals(issuer) ? "1" : "0");
    kv("not_before", formatOpenSslDate(cert.getNotBefore()));
    kv("not_after", formatOpenSslDate(cert.getNotAfter()));
    kv("hash", subjectHashOld(cert));
    kv("fingerprint_sha256", colonHex(shaDigest(cert.getEncoded(), "SHA-256")));
    kv("fingerprint_sha1", colonHex(shaDigest(cert.getEncoded(), "SHA-1")));
  }

  private static void kv(String key, String value) {
    if (value == null) return;
    String v = value.replace('\r', ' ').replace('\n', ' ').trim();
    if (v.length() == 0) return;
    System.out.println(key + "=" + v);
  }

  private static byte[] shaDigest(byte[] data, String alg) throws Exception {
    return MessageDigest.getInstance(alg).digest(data);
  }

  private static int pubkeyBits(PublicKey pk) {
    try {
      if (pk instanceof RSAPublicKey) {
        return ((RSAPublicKey) pk).getModulus().bitLength();
      }
      if (pk instanceof ECPublicKey) {
        return ((ECPublicKey) pk).getParams().getCurve().getField().getFieldSize();
      }
    } catch (Exception ignored) {
      /* fall through */
    }
    return 0;
  }

  private static String formatKeyUsage(boolean[] usage) {
    if (usage == null) return null;
    String[] names = {
      "digitalSignature",
      "nonRepudiation",
      "keyEncipherment",
      "dataEncipherment",
      "keyAgreement",
      "keyCertSign",
      "cRLSign",
      "encipherOnly",
      "decipherOnly",
    };
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < usage.length && i < names.length; i++) {
      if (!usage[i]) continue;
      if (sb.length() > 0) sb.append(", ");
      sb.append(names[i]);
    }
    return sb.length() == 0 ? null : sb.toString();
  }

  private static String formatEku(X509Certificate cert) {
    try {
      List eku = cert.getExtendedKeyUsage();
      if (eku == null || eku.isEmpty()) return null;
      StringBuilder sb = new StringBuilder();
      for (int i = 0; i < eku.size(); i++) {
        if (i > 0) sb.append(", ");
        sb.append(ekuName(String.valueOf(eku.get(i))));
      }
      return sb.toString();
    } catch (Exception e) {
      return null;
    }
  }

  private static String ekuName(String oid) {
    if ("10.20.0.3.172.16.1.1.1".equals(oid)) return "serverAuth";
    if ("10.20.0.3.172.16.1.1.2".equals(oid)) return "clientAuth";
    if ("10.20.0.3.172.16.1.1.3".equals(oid)) return "codeSigning";
    if ("10.20.0.3.172.16.1.1.4".equals(oid)) return "emailProtection";
    if ("10.20.0.3.172.16.1.1.8".equals(oid)) return "timeStamping";
    if ("10.20.0.3.172.16.1.1.9".equals(oid)) return "OCSPSigning";
    return oid;
  }

  private static String formatSan(X509Certificate cert) {
    try {
      Collection sans = cert.getSubjectAlternativeNames();
      if (sans == null || sans.isEmpty()) return null;
      StringBuilder sb = new StringBuilder();
      Iterator it = sans.iterator();
      while (it.hasNext()) {
        List item = (List) it.next();
        if (item == null || item.size() < 2) continue;
        int type = ((Integer) item.get(0)).intValue();
        String prefix = sanPrefix(type);
        String value = String.valueOf(item.get(1));
        if (sb.length() > 0) sb.append("; ");
        sb.append(prefix).append(value);
      }
      return sb.length() == 0 ? null : sb.toString();
    } catch (Exception e) {
      return null;
    }
  }

  private static String sanPrefix(int type) {
    switch (type) {
      case 1:
        return "email:";
      case 2:
        return "DNS:";
      case 6:
        return "URI:";
      case 7:
        return "IP:";
      case 4:
        return "dir:";
      default:
        return "other:";
    }
  }

  private static String extensionKeyId(X509Certificate cert, String oid, boolean ski) {
    byte[] ext = cert.getExtensionValue(oid);
    if (ext == null) return null;
    try {
      byte[] inner = unwrapOctet(ext);
      if (ski) {
        byte[] skiBytes = unwrapOctet(inner);
        return colonHex(skiBytes);
      }
      byte[] aki = extractAkiKeyId(inner);
      return aki != null ? colonHex(aki) : colonHex(inner);
    } catch (Exception e) {
      return colonHex(ext);
    }
  }

  private static byte[] unwrapOctet(byte[] der) {
    DerCursor c = new DerCursor(der);
    int tag = c.readByte();
    if (tag != 0x04) throw new IllegalArgumentException("not OCTET STRING");
    int len = c.readLength();
    byte[] out = new byte[len];
    System.arraycopy(der, c.pos, out, 0, len);
    return out;
  }

  private static byte[] extractAkiKeyId(byte[] seqDer) {
    DerCursor c = new DerCursor(seqDer);
    if (c.peekTag() != 0x30) return null;
    DerCursor seq = c.readSequence();
    while (seq.pos < seq.end) {
      int tag = seq.peekTag();
      if (tag == 0x80) {
        seq.readByte();
        int len = seq.readLength();
        byte[] out = new byte[len];
        System.arraycopy(seq.data, seq.pos, out, 0, len);
        return out;
      }
      seq.skipElement();
    }
    return null;
  }

  /**
   * OpenSSL X509_NAME_hash_old: MD5(subject Name DER), first 4 bytes LE → 8 hex.
   * MD5 必须纯 Java：Magisk 安装环境里 app_process 调 Conscrypt MessageDigest
   * 常会直接失败，而解析 / CA:TRUE / 有效期都不走 MD5，于是表现为「无法计算系统库文件名」。
   */
  private static String subjectHashOld(X509Certificate cert) throws Exception {
    byte[] nameDer = null;
    try {
      nameDer = extractSubjectNameDer(cert.getEncoded());
    } catch (Throwable ignored) {
      nameDer = null;
    }
    if (nameDer == null || nameDer.length == 0) {
      nameDer = cert.getSubjectX500Principal().getEncoded();
    }
    byte[] dig = md5(nameDer);
    int h =
        (dig[0] & 0xff)
            | ((dig[1] & 0xff) << 8)
            | ((dig[2] & 0xff) << 16)
            | ((dig[3] & 0xff) << 24);
    return String.format(Locale.US, "%08x", h);
  }

  private static final int[] MD5_K = {
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  };

  private static final int[] MD5_S = {
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  };

  private static byte[] md5(byte[] message) {
    int a0 = 0x67452301;
    int b0 = 0xefcdab89;
    int c0 = 0x98badcfe;
    int d0 = 0x10325476;
    int rem = message.length % 64;
    int padLen = rem < 56 ? 56 - rem : 120 - rem;
    byte[] padded = new byte[message.length + padLen + 8];
    System.arraycopy(message, 0, padded, 0, message.length);
    padded[message.length] = (byte) 0x80;
    long bitLen = (long) message.length * 8L;
    for (int i = 0; i < 8; i++) {
      padded[padded.length - 8 + i] = (byte) (bitLen >>> (8 * i));
    }
    for (int off = 0; off < padded.length; off += 64) {
      int[] m = new int[16];
      for (int i = 0; i < 16; i++) {
        int j = off + i * 4;
        m[i] =
            (padded[j] & 0xff)
                | ((padded[j + 1] & 0xff) << 8)
                | ((padded[j + 2] & 0xff) << 16)
                | ((padded[j + 3] & 0xff) << 24);
      }
      int a = a0;
      int b = b0;
      int c = c0;
      int d = d0;
      for (int i = 0; i < 64; i++) {
        int f;
        int g;
        if (i < 16) {
          f = (b & c) | (~b & d);
          g = i;
        } else if (i < 32) {
          f = (d & b) | (~d & c);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
        }
        int temp = d;
        d = c;
        c = b;
        b = b + Integer.rotateLeft(a + f + MD5_K[i] + m[g], MD5_S[i]);
        a = temp;
      }
      a0 += a;
      b0 += b;
      c0 += c;
      d0 += d;
    }
    byte[] out = new byte[16];
    writeIntLe(out, 0, a0);
    writeIntLe(out, 4, b0);
    writeIntLe(out, 8, c0);
    writeIntLe(out, 12, d0);
    return out;
  }

  private static void writeIntLe(byte[] out, int off, int v) {
    out[off] = (byte) v;
    out[off + 1] = (byte) (v >>> 8);
    out[off + 2] = (byte) (v >>> 16);
    out[off + 3] = (byte) (v >>> 24);
  }

  /** Extract subject Name TLV from TBSCertificate (on-wire encoding). */
  private static byte[] extractSubjectNameDer(byte[] certDer) {
    try {
      DerCursor c = new DerCursor(certDer);
      DerCursor certSeq = c.readSequence();
      DerCursor tbs = certSeq.readSequence();
      // version [0] OPTIONAL
      if (tbs.peekTag() == 0xa0) {
        tbs.skipElement();
      }
      tbs.skipElement(); // serial
      tbs.skipElement(); // signature alg
      tbs.skipElement(); // issuer
      tbs.skipElement(); // validity
      return tbs.readElementRaw(); // subject Name
    } catch (Throwable e) {
      // NoClassDefFoundError (missing nested class) is Error, not Exception
      return null;
    }
  }

  private static String formatName(X500Principal p, String nameopt) {
    if (nameopt != null && nameopt.toLowerCase(Locale.US).contains("multiline")) {
      return formatMultiline(p);
    }
    // RFC2253-ish
    return p.getName();
  }

  private static String formatMultiline(X500Principal p) {
    String rfc = p.getName();
    StringBuilder sb = new StringBuilder("\n");
    // CN=a,O=b → reverse RDN order often; split on unescaped commas
    String[] parts = rfc.split(",");
    for (String part : parts) {
      String t = part.trim();
      int eq = t.indexOf('=');
      if (eq <= 0) continue;
      String k = t.substring(0, eq).trim();
      String v = t.substring(eq + 1).trim();
      String label = k;
      if ("CN".equalsIgnoreCase(k)) label = "commonName";
      else if ("O".equalsIgnoreCase(k)) label = "organizationName";
      else if ("OU".equalsIgnoreCase(k)) label = "organizationalUnitName";
      else if ("C".equalsIgnoreCase(k)) label = "countryName";
      else if ("ST".equalsIgnoreCase(k) || "S".equalsIgnoreCase(k)) label = "stateOrProvinceName";
      else if ("L".equalsIgnoreCase(k)) label = "localityName";
      sb.append("    ").append(label).append("               = ").append(v).append('\n');
    }
    return sb.toString();
  }

  private static String formatOpenSslDate(Date d) {
    SimpleDateFormat fmt = new SimpleDateFormat("MMM dd HH:mm:ss yyyy z", Locale.US);
    fmt.setTimeZone(TimeZone.getTimeZone("GMT"));
    return fmt.format(d);
  }

  private static String colonHex(byte[] dig) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < dig.length; i++) {
      if (i > 0) sb.append(':');
      sb.append(String.format(Locale.US, "%02X", dig[i] & 0xff));
    }
    return sb.toString();
  }

  private static void writePem(String path, byte[] der) throws Exception {
    FileOutputStream out = new FileOutputStream(path);
    try {
      writePemStream(out, der);
    } finally {
      out.close();
    }
  }

  private static void writePemStream(java.io.OutputStream out, byte[] der) throws Exception {
    String b64 = Base64.encode(der);
    StringBuilder sb = new StringBuilder();
    sb.append("-----BEGIN CERTIFICATE-----\n");
    for (int i = 0; i < b64.length(); i += 64) {
      int end = Math.min(i + 64, b64.length());
      sb.append(b64, i, end).append('\n');
    }
    sb.append("-----END CERTIFICATE-----\n");
    out.write(sb.toString().getBytes(StandardCharsets.US_ASCII));
  }

  private static byte[] readAll(String path) throws Exception {
    FileInputStream in = new FileInputStream(path);
    try {
      byte[] buf = new byte[8192];
      ArrayList chunks = new ArrayList();
      int n;
      int total = 0;
      while ((n = in.read(buf)) >= 0) {
        byte[] part = new byte[n];
        System.arraycopy(buf, 0, part, 0, n);
        chunks.add(part);
        total += n;
      }
      byte[] all = new byte[total];
      int off = 0;
      for (int i = 0; i < chunks.size(); i++) {
        byte[] part = (byte[]) chunks.get(i);
        System.arraycopy(part, 0, all, off, part.length);
        off += part.length;
      }
      return all;
    } finally {
      in.close();
    }
  }

  /** Minimal DER cursor for extracting subject Name. */
  private static final class DerCursor {
    final byte[] data;
    int pos;
    final int end;

    DerCursor(byte[] data) {
      this(data, 0, data.length);
    }

    DerCursor(byte[] data, int pos, int end) {
      this.data = data;
      this.pos = pos;
      this.end = end;
    }

    int peekTag() {
      return data[pos] & 0xff;
    }

    DerCursor readSequence() {
      int tag = readByte();
      if (tag != 0x30) throw new IllegalArgumentException("not SEQUENCE");
      int len = readLength();
      int start = pos;
      pos += len;
      return new DerCursor(data, start, start + len);
    }

    void skipElement() {
      readByte(); // tag
      int len = readLength();
      pos += len;
    }

    byte[] readElementRaw() {
      int start = pos;
      readByte();
      int len = readLength();
      int header = pos - start;
      pos += len;
      byte[] out = new byte[header + len];
      System.arraycopy(data, start, out, 0, out.length);
      return out;
    }

    int readByte() {
      return data[pos++] & 0xff;
    }

    int readLength() {
      int b = readByte();
      if ((b & 0x80) == 0) return b;
      int n = b & 0x7f;
      int len = 0;
      for (int i = 0; i < n; i++) {
        len = (len << 8) + readByte();
      }
      return len;
    }
  }

  /** Tiny Base64 (no android.util dependency). */
  private static final class Base64 {
    private static final char[] ENC =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".toCharArray();

    static String encode(byte[] data) {
      StringBuilder sb = new StringBuilder((data.length + 2) / 3 * 4);
      int i = 0;
      while (i + 2 < data.length) {
        int v = ((data[i] & 0xff) << 16) | ((data[i + 1] & 0xff) << 8) | (data[i + 2] & 0xff);
        sb.append(ENC[(v >> 18) & 63]);
        sb.append(ENC[(v >> 12) & 63]);
        sb.append(ENC[(v >> 6) & 63]);
        sb.append(ENC[v & 63]);
        i += 3;
      }
      if (i < data.length) {
        int a = data[i] & 0xff;
        sb.append(ENC[a >> 2]);
        if (i + 1 < data.length) {
          int b = data[i + 1] & 0xff;
          sb.append(ENC[((a & 3) << 4) | (b >> 4)]);
          sb.append(ENC[(b & 15) << 2]);
          sb.append('=');
        } else {
          sb.append(ENC[(a & 3) << 4]);
          sb.append('=');
          sb.append('=');
        }
      }
      return sb.toString();
    }

    static byte[] decode(String s) {
      int pad = 0;
      if (s.endsWith("==")) pad = 2;
      else if (s.endsWith("=")) pad = 1;
      int len = s.length();
      byte[] out = new byte[len / 4 * 3 - pad];
      int[] dec = new int[128];
      java.util.Arrays.fill(dec, -1);
      for (int i = 0; i < ENC.length; i++) {
        dec[ENC[i]] = i;
      }
      int o = 0;
      for (int i = 0; i + 3 < len; i += 4) {
        int a = dec[s.charAt(i) & 127];
        int b = dec[s.charAt(i + 1) & 127];
        int c = s.charAt(i + 2) == '=' ? 0 : dec[s.charAt(i + 2) & 127];
        int d = s.charAt(i + 3) == '=' ? 0 : dec[s.charAt(i + 3) & 127];
        if (a < 0 || b < 0 || c < 0 || d < 0) {
          throw new IllegalArgumentException("bad base64");
        }
        int v = (a << 18) | (b << 12) | (c << 6) | d;
        if (o < out.length) out[o++] = (byte) (v >> 16);
        if (o < out.length) out[o++] = (byte) (v >> 8);
        if (o < out.length) out[o++] = (byte) v;
      }
      return out;
    }
  }
}
