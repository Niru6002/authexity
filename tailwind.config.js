export default {
    darkMode: "class",
    theme: {
      extend: {
        animation: {
          "border-glow": "glow 1.5s infinite alternate",
        },
        keyframes: {
          glow: {
            "0%": { boxShadow: "0px 0px 10px rgba(0, 0, 255, 0.5)" },
            "100%": { boxShadow: "0px 0px 20px rgba(255, 105, 180, 0.8)" },
          },
        },
      },
    },
    plugins: [],
  };
  