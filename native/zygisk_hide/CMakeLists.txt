cmake_minimum_required(VERSION 3.22.1)
project(certbridge_zygisk_hide)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 经典 Zygisk API（主路径，始终构建）
add_library(certbridge_hide SHARED
  zygisk_main.cpp
  mount_filter.cpp
)

target_include_directories(certbridge_hide PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

find_library(log-lib log)
target_link_libraries(certbridge_hide ${log-lib})

# Magisk / Zygisk 约定：zygisk/<abi>.so
set_target_properties(certbridge_hide PROPERTIES
  OUTPUT_NAME "${ANDROID_ABI}"
  PREFIX ""
)

target_compile_options(certbridge_hide PRIVATE
  -fvisibility=hidden
  -ffunction-sections
  -fdata-sections
  -Wall
  -Wextra
)

target_link_options(certbridge_hide PRIVATE
  -Wl,--gc-sections
  -Wl,--exclude-libs,ALL
)

# 可选 ZN Module 辅路径：默认关闭。开启前须校准注入目标并准备非空 zn_modules.txt
option(BUILD_ZN_MODULE "Build optional ZN module so (service-side filter)" OFF)
if(BUILD_ZN_MODULE)
  add_library(cb_zn_hide SHARED
    zn_main.cpp
    mount_filter.cpp
  )
  target_include_directories(cb_zn_hide PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
  target_link_libraries(cb_zn_hide ${log-lib})
  set_target_properties(cb_zn_hide PROPERTIES
    OUTPUT_NAME "cb_zn_hide"
    PREFIX "lib"
  )
  target_compile_options(cb_zn_hide PRIVATE
    -fvisibility=hidden
    -ffunction-sections
    -fdata-sections
    -Wall
    -Wextra
  )
  target_link_options(cb_zn_hide PRIVATE
    -Wl,--gc-sections
    -Wl,--exclude-libs,ALL
  )
endif()
