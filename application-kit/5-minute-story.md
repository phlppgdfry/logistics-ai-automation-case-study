# 5-minute story

1. **The problem (30 s).** "A pallet distributor gets 640 emails a day. Half ask 'where is my delivery?' or 'send me the POD'. The answer is in the transport system, but a person spends four minutes finding it. They wanted to hire an extra agent. The director said: show me what can be automated first."

2. **How I started (45 s).** "Not with a chatbot demo. I labelled a thousand emails with the team and timed the work. Writing the reply was not the problem; finding the shipment was, because customers use four kinds of reference. And one in eight 'status' emails was really a complaint."

3. **The design decision (60 s).** "The quick demo gives a model the mailbox and a send button. I split it. A Copilot Studio agent only reads: it returns JSON and has no tools. A Power Automate flow looks up the TMS read-only, checks whether this sender may see this shipment, and applies eighteen named rules. Only then does it send a template, prepare a draft, or route to a person. So a prompt injection can at most produce a wrong label."

4. **The proof (60 s).** "With the team lead I wrote 48 test emails, from easy to nasty: Gmail impostors, stale subcontractor data, legal threats, out-of-office loops. The design gets all 48 right. The naive design gets 23 of them harmfully wrong, mostly leaking data to strangers and sending cheerful status lines to angry customers. It runs in CI on every commit."

5. **The money (45 s).** "It frees about 3,800 hours a year. But nobody is fired, so that isn't cash. Cash comes only from not hiring temps and not making the 2027 hire. If the hire happens anyway, the NPV drops from about 145k to 14k. So I put 'confirm the hire is on hold' on the go/no-go list. And draft-only mode already covers the cash, so the rollout can start safely."

6. **What it says about me (30 s).** "I start at the work, not the tool. I decide where AI belongs and where it doesn't. I test before I promise. And I'm honest about what's simulated. I built the agent and the flows in a developer environment, measured the reading on a real model, and wrote down what broke."
