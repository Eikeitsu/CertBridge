/**
 * Host-side unit tests for mount_filter (no Android NDK required).
 * Build: c++ -std=c++20 -I. -DCERTBRIDGE_HOST_TEST=1 mount_filter.cpp mount_filter_test.cpp
 * Or: npm run test:zygisk-filter
 */
#include "mount_filter.hpp"

#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

static int g_fails = 0;

static void expect(bool cond, const char *msg) {
  if (!cond) {
    std::fprintf(stderr, "FAIL: %s\n", msg);
    ++g_fails;
  }
}

static void test_trace_lines() {
  expect(cb_hide::line_is_certbridge_trace(
             "120 1 0:1 / /apex/com.android.conscrypt/cacerts rw - tmpfs /dev/.fs0/apex"),
         "fs0 stage path");
  expect(cb_hide::line_is_certbridge_trace(
             "x /data/adb/modules/CertBridge/zygisk/arm64-v8a.so"),
         "module so path");
  expect(cb_hide::line_is_certbridge_trace(
             "overlay upperdir=/data/adb/modules/CertBridge/system/etc"),
         "overlay upperdir");
  expect(!cb_hide::line_is_certbridge_trace("120 1 0:1 / /system/etc/security/cacerts rw"),
         "plain cacerts not our path");
}

static void test_filter_mount_text() {
  const char *raw =
      "10 1 0:1 / /system rw\n"
      "11 1 0:2 / /apex/com.android.conscrypt/cacerts rw - tmpfs /dev/.fs0/apex\n"
      "12 1 0:3 / /vendor rw\n";
  std::string out = cb_hide::filter_trace_text(raw);
  expect(out.find("/dev/.fs0") == std::string::npos, "filtered fs0 line");
  expect(out.find("/system rw") != std::string::npos, "kept system");
  expect(out.find("/vendor rw") != std::string::npos, "kept vendor");
}

static void test_filter_maps_text() {
  const char *raw =
      "7a123000-7a124000 r-xp 00000000 fd:00 1 /system/lib64/libc.so\n"
      "7b000000-7b001000 r-xp 00000000 fd:01 2 /data/adb/modules/CertBridge/zygisk/arm64-v8a.so\n"
      "7c000000-7c001000 rw-p 00000000 00:00 0 [anon:libc_malloc]\n";
  std::string out = cb_hide::filter_trace_text(raw);
  expect(out.find("CertBridge") == std::string::npos, "filtered module so maps");
  expect(out.find("libc.so") != std::string::npos, "kept libc maps");
  expect(out.find("[anon:libc_malloc]") != std::string::npos, "kept anon tagged");
}

static void test_path_helpers() {
  expect(cb_hide::path_is_maps_table("/proc/self/maps"), "abs maps");
  expect(cb_hide::path_is_maps_table("maps"), "basename maps");
  expect(cb_hide::path_is_mount_table("/proc/self/mountinfo"), "mountinfo");
  expect(!cb_hide::path_is_mount_table("/proc/self/mountstats"), "not mountstats");
  expect(cb_hide::path_needs_trace_filter_resolved("maps", "/proc/self"), "rel maps under proc");
  expect(!cb_hide::path_needs_trace_filter_resolved("maps", "/data/local"), "rel maps not under proc");
}

static void test_blacklist_mode() {
  cb_hide::host_test_set_filter_state(cb_hide::FilterMode::Blacklist, {}, {});
  expect(!cb_hide::should_filter_process("tv.danmaku.bili"), "empty bl: no filter");
  expect(!cb_hide::should_filter_process("com.reqable.android"), "capture exempt");

  cb_hide::host_test_set_filter_state(cb_hide::FilterMode::Blacklist, {"tv.danmaku.bili"}, {});
  expect(cb_hide::should_filter_process("tv.danmaku.bili"), "bl hit");
  expect(cb_hide::should_filter_process("tv.danmaku.bili:push"), "bl prefix");
  expect(!cb_hide::should_filter_process("com.example.app"), "bl miss");
  expect(!cb_hide::should_filter_process("com.reqable.android"), "capture still exempt on bl");
}

static void test_whitelist_mode() {
  cb_hide::host_test_set_filter_state(cb_hide::FilterMode::Whitelist, {}, {});
  expect(cb_hide::should_filter_process("tv.danmaku.bili"), "empty wl: filter others");
  expect(!cb_hide::should_filter_process("com.reqable.android"), "capture exempt in wl mode");

  cb_hide::host_test_set_filter_state(cb_hide::FilterMode::Whitelist, {}, {"com.example.app"});
  expect(!cb_hide::should_filter_process("com.example.app"), "wl hit: skip");
  expect(cb_hide::should_filter_process("tv.danmaku.bili"), "wl miss: filter");
  expect(!cb_hide::should_filter_process("com.proxy.pin"), "capture exempt");
}

int main() {
  test_trace_lines();
  test_filter_mount_text();
  test_filter_maps_text();
  test_path_helpers();
  test_blacklist_mode();
  test_whitelist_mode();
  if (g_fails) {
    std::fprintf(stderr, "%d test(s) failed\n", g_fails);
    return 1;
  }
  std::printf("mount_filter_test: ok\n");
  return 0;
}
