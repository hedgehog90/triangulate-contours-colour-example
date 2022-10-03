module.exports = {
    hexToRgba: function(hex){
        if (Array.isArray(hex)) {
            return hex.map(h=>parseInt(h));
        }
        let c;
        let rgba = true;
        if (typeof hex === "number") {
            c = hex;
        } else {
            let m = hex.match(/^#([0-9a-f]+)$/i);
            if (m) {
                hex = m[1];
                rgba = hex.length>6;
                if (hex.length == 3) {
                    let h = hex.split('');
                    hex = [h[0], h[0], h[1], h[1], h[2], h[2]].join('');
                }
                hex = "0x"+hex;
            }
            c = parseInt(hex);
        }
        if (rgba) {
            return [(c>>24)&255, (c>>16)&255, (c>>8)&255, c&255].map(c=>c/255);
        } else {
            return [(c>>16)&255, (c>>8)&255, c&255, 255].map(c=>c/255);
        }
    }
}