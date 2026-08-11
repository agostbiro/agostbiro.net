module github.com/agostbiro/agostbiro.net

// Kept low on purpose: Hugo only uses the module system to fetch the theme, no
// Go code is compiled. A high directive would fail on build images shipping an
// older toolchain (Netlify).
go 1.19

require github.com/hanwenguo/hugo-theme-nostyleplease v0.0.0-20250120053207-cfbfe4e8ed13 // indirect
