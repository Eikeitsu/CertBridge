package com.certbridge.x509;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
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
      System.out.println("cbx509 1.0.0 (CertBridge Lite)");
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
    if (wantFpSha256) {
      MessageDigest sha = MessageDigest.getInstance("SHA-256");
      byte[] dig = sha.digest(cert.getEncoded());
      System.out.println("sha256 Fingerprint=" + colonHex(dig));
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
        && !wantText) {
      // openssl x509 -in f -noout  → validate only
      // openssl x509 -in f → print PEM; we only hit this if -noout absent and no other flags
      writePemStream(System.out, cert.getEncoded());
    }
  }

  private static X509Certificate parseCert(byte[] data, String inform) throws Exception {
    CertificateFactory cf = CertificateFactory.getInstance("X.509");
    InputStream in;
    if ("DER".equals(inform)) {
      in = new ByteArrayInputStream(data);
    } else {
      String text = new String(data, StandardCharsets.ISO_8859_1);
      if (!text.contains("BEGIN CERTIFICATE")) {
        // try DER anyway
        in = new ByteArrayInputStream(data);
      } else {
        in = new ByteArrayInputStream(data);
      }
    }
    return (X509Certificate) cf.generateCertificate(in);
  }

  /** OpenSSL X509_NAME_hash_old: MD5(subject Name DER), first 4 bytes LE → 8 hex. */
  private static String subjectHashOld(X509Certificate cert) throws Exception {
    byte[] nameDer = extractSubjectNameDer(cert.getEncoded());
    if (nameDer == null) {
      nameDer = cert.getSubjectX500Principal().getEncoded();
    }
    MessageDigest md5 = MessageDigest.getInstance("MD5");
    byte[] dig = md5.digest(nameDer);
    int h =
        (dig[0] & 0xff)
            + ((dig[1] & 0xff) << 8)
            + ((dig[2] & 0xff) << 16)
            + ((dig[3] & 0xff) << 24);
    return String.format(Locale.US, "%08x", h);
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
    } catch (Exception e) {
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
    private final byte[] data;
    private int pos;
    private final int end;

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

    private int readByte() {
      return data[pos++] & 0xff;
    }

    private int readLength() {
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
  }
}
