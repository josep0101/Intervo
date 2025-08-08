async function run(model, input) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/419b708f7bd05fae27adc304aa848191/ai/run/${model}`,
    {
      headers: { Authorization: "Bearer xXPb6vIHxjwaomfVMzJGYiYD9kyvfN6CGVTqUBwN" },
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  const result = await response.json();
  return result;
}

run("@cf/meta/llama-3-8b-instruct", {
  messages: [
    {
      role: "system",
      content: "You are a friendly assistan that helps write stories",
    },
    {
      role: "user",
      content:
        "Write a short story about a llama that goes on a journey to find an orange cloud ",
    },
  ],
}).then((response) => {
  console.log(JSON.stringify(response));
});
