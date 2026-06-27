import os
import re
import json
import urllib.request
from app.ml.engine import engine

class AssistantService:
    def __init__(self):
        # Cache top 50 players by overall for basic system context
        self.top_players = engine.df_raw.sort_values(by='Overall', ascending=False).head(50)
        self.top_players_json = self.top_players[['Name', 'Age', 'Overall', 'Potential', 'Value', 'Position']].to_dict(orient='records')

    def find_players_in_query(self, query):
        """Identifies which players from the dataset are mentioned in the query."""
        # Remove special characters to avoid regex issues
        cleaned = re.sub(r'[^a-zA-Z\s]', ' ', query)
        words = [w.strip() for w in cleaned.split() if len(w.strip()) > 3]
        
        stopwords = {
            'should', 'sell', 'keep', 'buy', 'transfer', 'squad', 'team', 'best', 'compare',
            'worth', 'value', 'scout', 'find', 'winger', 'midfielder', 'defender', 'striker',
            'under', 'over', 'million', 'thousand', 'from', 'with', 'have', 'does', 'what',
            'which', 'player', 'ratings', 'rating', 'potential', 'stats', 'stat', 'club',
            'nationality', 'fast', 'slow', 'good', 'great', 'about', 'know', 'fifa', 'assistant',
            'oldest', 'youngest', 'salary', 'wages', 'country', 'average', 'highest', 'overall',
            'tell', 'show', 'give', 'want', 'need', 'please', 'info', 'more', 'here', 'who',
            'how', 'where', 'when', 'whom', 'whose', 'doesnt', 'is', 'are', 'was', 'were',
            'have', 'has', 'had', 'did', 'done', 'doing', 'shall', 'will', 'would', 'could',
            'play', 'plays', 'playing', 'player', 'players', 'game', 'games', 'card', 'cards'
        }
        
        found_players = []
        for word in words:
            if word.lower() in stopwords:
                continue
            # Search in df_raw for Name contains word
            matches = engine.df_raw[engine.df_raw['Name'].str.contains(word, case=False, na=False)]
            if not matches.empty:
                # Sort matches by Overall desc to ensure we get the most famous player first
                matches = matches.sort_values(by='Overall', ascending=False)
                for _, row in matches.head(1).iterrows():
                    player_data = engine._row_to_full_player(row)
                    if not any(p['name'] == player_data['name'] for p in found_players):
                        found_players.append(player_data)
                        
        # Also support full name matches where the name contains spaces
        # Check if any famous player name is in the query directly
        query_lower = query.lower()
        for p in engine.famous_players:
            p_name_lower = p['name'].lower()
            # Check last name or full name
            last_name = p_name_lower.split('.')[-1].strip() if '.' in p_name_lower else p_name_lower.split()[-1]
            if p_name_lower in query_lower or last_name in query_lower:
                if not any(pf['name'] == p['name'] for pf in found_players):
                    found_players.append(p)
                    
        return found_players[:2] # Limit to top 2 found players for context density

    def parse_squad_requirements(self, query):
        """Parses position and budget from the user query."""
        positions = engine.positions
        req_position = None
        
        # Check standard FIFA positions (e.g., ST, CAM, CM, CB, GK)
        for pos in positions:
            if re.search(r'\b' + re.escape(pos) + r'\b', query, re.IGNORECASE):
                req_position = pos
                break
                
        # Fallback keyword matching for positions
        if not req_position:
            query_lower = query.lower()
            if 'striker' in query_lower or 'forward' in query_lower:
                req_position = 'ST'
            elif 'winger' in query_lower:
                req_position = 'RW' # Default to RW/LW
            elif 'midfielder' in query_lower:
                req_position = 'CM'
            elif 'defender' in query_lower or 'centre back' in query_lower:
                req_position = 'CB'
            elif 'goalkeeper' in query_lower or 'keeper' in query_lower:
                req_position = 'GK'

        # Budget matching (e.g. "under 50M", "budget 20m", "15 million")
        budget = None
        budget_match = re.search(r'(\d+(?:\.\d+)?)\s*(m|million|k|thousand)', query, re.IGNORECASE)
        if budget_match:
            amount = float(budget_match.group(1))
            unit = budget_match.group(2).lower()
            if 'm' in unit:
                budget = amount * 1_000_000
            else:
                budget = amount * 1_000
        else:
            # Look for plain numbers near M/million
            num_match = re.search(r'\b(\d+)\s*(?:million|m)\b', query, re.IGNORECASE)
            if num_match:
                budget = float(num_match.group(1)) * 1_000_000

        return req_position, budget

    def query_gemini_api(self, prompt):
        """Calls Gemini API using standard library urllib."""
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 350
            }
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                return res_data['candidates'][0]['content']['parts'][0]['text']
        except Exception as e:
            print(f"Gemini API call failed: {e}")
            return None

    def local_fallback_scout(self, query, players, req_pos, budget):
        """Rule-based local scout generator when API key is missing."""
        query_lower = query.lower()

        # Case 1: Player Comparison ("vs", "compare", "or")
        if 'vs' in query_lower or ('compare' in query_lower and len(players) >= 2):
            if len(players) < 2:
                return "SCOUT REPORT: Name two players clearly (e.g., 'Messi vs Ronaldo') to trigger comparison analysis."
            
            p1, p2 = players[0], players[1]
            v1_m = p1['actual_value'] / 1e6
            v2_m = p2['actual_value'] / 1e6
            
            better = p1['name'] if p1['overall'] >= p2['overall'] else p2['name']
            worse = p2['name'] if p1['overall'] >= p2['overall'] else p1['name']
            diff_overall = abs(p1['overall'] - p2['overall'])
            diff_val = abs(v1_m - v2_m)

            return (
                f"SCOUT REPORT: Head-to-Head Analysis:\n\n"
                f"• {p1['name']} ({p1['position']}) | Age: {p1['age']} | Rating: {p1['overall']}/{p1['potential']} | Value: €{v1_m:.1f}M | Pace: {p1['sprintspeed']} | Dribbling: {p1['dribbling']}\n"
                f"• {p2['name']} ({p2['position']}) | Age: {p2['age']} | Rating: {p2['overall']}/{p2['potential']} | Value: €{v2_m:.1f}M | Pace: {p2['sprintspeed']} | Dribbling: {p2['dribbling']}\n\n"
                f"VERDICT: {better} is the superior asset with a +{diff_overall} overall rating advantage. "
                f"Market value delta is €{diff_val:.1f}M. Choose {better} for immediate impact, or consider age difference ({p1['age']} vs {p2['age']}) for long-term squad planning."
            )

        # Case 2: Transfer Advice ("sell", "keep", "buy")
        if any(w in query_lower for w in ['sell', 'keep', 'transfer', 'buy']):
            if not players:
                return "SCOUT REPORT: Clarify the player name (e.g. 'Should I sell Hazard?')."
            
            p = players[0]
            val_m = p['actual_value'] / 1e6
            wage_k = p['wage'] / 1e3
            
            if p['age'] >= 30:
                action = "SELL"
                reason = f"Player is {p['age']} years old. Overall ({p['overall']}) will start decaying soon. Liquidate now to recover €{val_m:.1f}M in funds and free up €{wage_k:.0f}K/week in wages."
            elif p['potential'] - p['overall'] >= 4:
                action = "KEEP (DEVELOP)"
                reason = f"Player is only {p['age']} with +{p['potential'] - p['overall']} growth potential (Overall {p['overall']} -> Potential {p['potential']}). Market value of €{val_m:.1f}M is guaranteed to appreciate."
            else:
                action = "KEEP"
                reason = f"Solid rating profile of {p['overall']} overall at age {p['age']}. Current valuation of €{val_m:.1f}M is stable."

            return (
                f"SCOUT REPORT: Transfer Analysis for {p['name']} ({p['position']}):\n\n"
                f"• Stats: Age {p['age']} | Overall {p['overall']} | Potential {p['potential']} | Market Value €{val_m:.1f}M | Wage €{wage_k:.0f}K/week\n"
                f"• Recommendation: {action}\n"
                f"• Scout Notes: {reason}"
            )

        # Case 3: Value Explanation ("why", "worth", "explain")
        if 'why' in query_lower or 'worth' in query_lower or 'explain' in query_lower:
            if not players:
                return "SCOUT REPORT: Which player's value are you inquiring about? (e.g. 'Why is Mbappe worth 100M?')"
            
            p = players[0]
            val_m = p['actual_value'] / 1e6
            wage_k = p['wage'] / 1e3
            
            return (
                f"SCOUT REPORT: Market Value Breakdown for {p['name']}:\n\n"
                f"• Valuation: €{val_m:.1f}M | Weekly Wage: €{wage_k:.0f}K\n"
                f"• Core Drivers:\n"
                f"  1. Ability Index: High Overall ({p['overall']}) combined with Potential ({p['potential']}) makes them elite.\n"
                f"  2. Key Technicals: Dribbling {p['dribbling']} | Reactions {p['reactions']} | Sprint Speed {p['sprintspeed']} | Short Passing {p['passing']}.\n"
                f"  3. Prestige Factor: Reputation score of {p['reputation']}/5 stars elevates marketing and commercial value."
            )

        # Case 4: Squad Building ("best", "squad", "under", positions)
        if 'squad' in query_lower or 'best' in query_lower or req_pos or budget:
            pos = req_pos or 'CM'
            max_val = budget or 50_000_000
            
            matches = engine.df_raw[
                (engine.df_raw['Position'] == pos) & 
                (engine.df_raw['Value'] <= max_val) & 
                (engine.df_raw['Value'] > 0)
            ]
            matches = matches.sort_values(by='Overall', ascending=False).head(3)
            
            if matches.empty:
                return f"SCOUT REPORT: No transfer targets matching {pos} found in database under €{max_val/1e6:.1f}M."
                
            res = f"SCOUT REPORT: Recommendations for {pos} under Budget limit €{max_val/1e6:.1f}M:\n\n"
            for idx, (_, row) in enumerate(matches.iterrows()):
                val = row['Value'] / 1e6
                res += f" {idx+1}. {row['Name']} | Age: {row['Age']} | Overall: {row['Overall']} | Potential: {row['Potential']} | Value: €{val:.1f}M | Club: {row['Club']}\n"
            return res

        # Case 5: Scouting speed & dribbling wingers/midfielders
        if any(w in query_lower for w in ['scout', 'find', 'fast', 'pace', 'dribbler']):
            matches = engine.df_raw[
                (engine.df_raw['SprintSpeed'] >= 82) & 
                (engine.df_raw['Dribbling'] >= 82) & 
                (engine.df_raw['Value'] > 0)
            ]
            matches = matches.sort_values(by='Overall', ascending=False).head(3)
            
            res = "SCOUT REPORT: Top high-speed dribblers found in dataset:\n\n"
            for idx, (_, row) in enumerate(matches.iterrows()):
                val = row['Value'] / 1e6
                res += f" {idx+1}. {row['Name']} ({row['Position']}) | Overall: {row['Overall']} | Pace: {row['SprintSpeed']} | Dribble: {row['Dribbling']} | Value: €{val:.1f}M\n"
            return res

        # Case 6: Dynamic General Dataset statistics (oldest, youngest, highest wage, highest value, highest overall)
        if any(w in query_lower for w in ['oldest', 'youngest', 'highest', 'top', 'max', 'most']):
            if 'oldest' in query_lower:
                row = engine.df_raw[engine.df_raw['Value'] > 0].sort_values(by='Age', ascending=False).iloc[0]
                val = row['Value'] / 1e6
                return f"SCOUT REPORT: The oldest active player in the dataset is {row['Name']} ({row['Age']} years old, OVR: {row['Overall']}, Value: €{val:.1f}M, Club: {row['Club']})."
            elif 'youngest' in query_lower:
                row = engine.df_raw[engine.df_raw['Value'] > 0].sort_values(by='Age', ascending=True).iloc[0]
                val = row['Value'] / 1e6
                return f"SCOUT REPORT: The youngest player with valid market value in the dataset is {row['Name']} ({row['Age']} years old, OVR: {row['Overall']}, Value: €{val:.1f}M, Club: {row['Club']})."
            elif 'wage' in query_lower or 'salary' in query_lower or 'paid' in query_lower:
                row = engine.df_raw.sort_values(by='Wage', ascending=False).iloc[0]
                val = row['Value'] / 1e6
                return f"SCOUT REPORT: The highest-earning player is {row['Name']} (Club: {row['Club']}) with a weekly wage of €{row['Wage']:,.0f} and market value €{val:.1f}M."
            elif 'potential' in query_lower:
                row = engine.df_raw.sort_values(by='Potential', ascending=False).iloc[0]
                val = row['Value'] / 1e6
                return f"SCOUT REPORT: The player with the highest potential is {row['Name']} (Potential: {row['Potential']}, Current OVR: {row['Overall']}, Value: €{val:.1f}M, Club: {row['Club']})."
            elif 'value' in query_lower or 'expensive' in query_lower or 'worth' in query_lower:
                row = engine.df_raw.sort_values(by='Value', ascending=False).iloc[0]
                val = row['Value'] / 1e6
                return f"SCOUT REPORT: The player with the highest market value in the dataset is {row['Name']} (Club: {row['Club']}) valued at €{val:.1f}M."
            else:
                row = engine.df_raw.sort_values(by='Overall', ascending=False).iloc[0]
                val = row['Value'] / 1e6
                return f"SCOUT REPORT: The highest-rated player in the dataset is {row['Name']} (OVR: {row['Overall']}, Potential: {row['Potential']}, Value: €{val:.1f}M, Club: {row['Club']})."

        # Case 7: Specific Player attribute/stat query (E.g. "What is Hazard's club?")
        if players:
            p = players[0]
            val_m = p['actual_value'] / 1e6
            wage_k = p['wage'] / 1e3
            
            # 1. Club check
            if any(w in query_lower for w in ['club', 'team', 'play']):
                return f"SCOUT REPORT: {p['name']} plays for {p['club']}."
                
            # 2. Nationality check
            if any(w in query_lower for w in ['nationality', 'country', 'from', 'nation', 'born']):
                return f"SCOUT REPORT: {p['name']}'s nationality is {p['nationality']}."
                
            # 3. Position check
            if any(w in query_lower for w in ['position', 'role', 'pos']):
                return f"SCOUT REPORT: {p['name']} plays as a {p['position']}."
                
            # 4. Age check
            if any(w in query_lower for w in ['age', 'old', 'years']):
                return f"SCOUT REPORT: {p['name']} is {p['age']} years old."
                
            # 5. Overall check
            if any(w in query_lower for w in ['overall', 'rating', 'ovr', 'good']):
                return f"SCOUT REPORT: {p['name']} has an overall rating of {p['overall']} (Potential: {p['potential']})."
                
            # 6. Potential check
            if any(w in query_lower for w in ['potential', 'future', 'grow']):
                return f"SCOUT REPORT: {p['name']} has a potential rating of {p['potential']} (Current OVR: {p['overall']})."
                
            # 7. Wage check
            if any(w in query_lower for w in ['wage', 'salary', 'earn', 'paid']):
                return f"SCOUT REPORT: {p['name']}'s weekly wage is €{p['wage']:,.0f}."
                
            # 8. Value check
            if any(w in query_lower for w in ['value', 'worth', 'price', 'cost']):
                return f"SCOUT REPORT: {p['name']} is currently valued at €{val_m:.1f}M."
                
            # 9. Pace/Speed check
            if any(w in query_lower for w in ['pace', 'speed', 'fast', 'acceleration', 'sprint']):
                return f"SCOUT REPORT: {p['name']} Pace Stats: Sprint Speed {p['sprintspeed']} | Acceleration {p['acceleration']}."
                
            # 10. Dribbling check
            if any(w in query_lower for w in ['dribbl', 'ball control', 'ballcontrol']):
                return f"SCOUT REPORT: {p['name']} Dribbling Stats: Dribbling {p['dribbling']} | Ball Control {p['ballcontrol']}."
                
            # 11. Shooting check
            if any(w in query_lower for w in ['shoot', 'finish', 'score', 'shot']):
                return f"SCOUT REPORT: {p['name']} Shooting Stats: Finishing {p['finishing']} | Shot Power {p['shotpower']}."
                
            # 12. Passing check
            if any(w in query_lower for w in ['pass', 'cross', 'vision']):
                return f"SCOUT REPORT: {p['name']} Passing Stats: Short Passing {p['passing']} | Vision {p['vision']} | Crossing {p['crossing']}."
                
            # 13. Physicality check
            if any(w in query_lower for w in ['strength', 'physical', 'stamina', 'fit']):
                return f"SCOUT REPORT: {p['name']} Physicality Stats: Strength {p['strength']} | Stamina {p['stamina']}."
                
            # 14. Weak Foot check
            if 'weak' in query_lower:
                return f"SCOUT REPORT: {p['name']} has a {p['weakfoot']}/5 stars weak foot rating."
                
            # 15. Skill Moves check
            if 'skill' in query_lower:
                return f"SCOUT REPORT: {p['name']} has a {p['skillmoves']}/5 stars skill moves rating."
                
            # 16. Reputation check
            if any(w in query_lower for w in ['reputation', 'repute', 'fame']):
                return f"SCOUT REPORT: {p['name']} has an international reputation rating of {p['reputation']}/5 stars."

            # Default to full player card if player matches but attribute doesn't
            return (
                f"SCOUT REPORT: Player profile for {p['name']} ({p['position']}):\n\n"
                f"• Personal: Age {p['age']} | Nationality: {p['nationality']} | Club: {p['club']}\n"
                f"• Ratings: Overall {p['overall']} | Potential {p['potential']} | Reputation {p['reputation']}/5★\n"
                f"• Financials: Market Value €{val_m:.1f}M | Weekly Wage €{wage_k:.0f}K\n"
                f"• Key Technicals: Dribbling {p['dribbling']} | Short Passing {p['passing']} | Speed {p['sprintspeed']} | Finishing {p['finishing']}"
            )

        # Fallback default scout greeting
        return (
            "SCOUT REPORT: FIFAVal Agent active. Tactical parameters not resolved.\n\n"
            "Ready to assist with:\n"
            "1. Transfer Advice: 'Should I sell Modric?'\n"
            "2. Squad Building: 'Best ST under 30M?'\n"
            "3. Value Explanation: 'Why is K. De Bruyne worth 100M?'\n"
            "4. Player Comparison: 'Salah vs Hazard'\n"
            "5. Player Scouting: 'Find a fast winger'\n"
            "6. Dynamic Stat lookups: 'Who is the oldest player?' or 'What club does Sergio Ramos play for?'"
        )

    def analyze(self, query):
        """Retrieves data and analyzes queries with LLM RAG or local heuristics."""
        query_lower = query.lower().strip()
        
        # Conversational / acknowledgment check
        cleaned_query = re.sub(r'[^a-z\s]', '', query_lower).strip()
        conversational_keywords = {
            'ok', 'okay', 'thanks', 'thank you', 'yes', 'no', 'cool', 'awesome', 'great', 
            'done', 'understood', 'copy that', 'fine', 'perfect'
        }
        if cleaned_query in conversational_keywords or cleaned_query == 'thank you very much':
            return "SCOUT REPORT: Copy that. Do you need details on another transfer target, squad builder, player comparison, or attribute lookup?"

        # Guard clause: check if the query is relevant to football/FIFA/players/teams/nations.
        football_keywords = [
            'fifa', 'player', 'sell', 'keep', 'buy', 'transfer', 'squad', 'team', 'best', 
            'compare', 'vs', 'worth', 'value', 'scout', 'find', 'winger', 'midfielder', 
            'defender', 'striker', 'goalkeeper', 'rating', 'potential', 'overall', 'stats',
            'oldest', 'youngest', 'wage', 'salary', 'paid', 'club', 'play for', 'nationality',
            'country', 'from', 'age', 'how old', 'speed', 'pace', 'fast', 'dribbling',
            'shooting', 'finishing', 'passing', 'strength', 'physical', 'most', 'expensive',
            'messi', 'ronaldo', 'mbappe', 'salah', 'neymar', 'hazard', 'kane', 'lewandowski',
            'ramos', 'ter stegen', 'alisson', 'van dijk', 'griezmann', 'kroos', 'de bruyne',
            'role', 'position', 'pos', 'weak', 'skill', 'reputation'
        ]
        
        if not any(keyword in query_lower for keyword in football_keywords):
            return "I only know FIFA 19 data."

        players = self.find_players_in_query(query)
        req_pos, budget = self.parse_squad_requirements(query)

        # Build prompt for LLM (in case GEMINI_API_KEY is active)
        prompt = (
            "You are FIFAVal Assistant, an expert FIFA 19 player analyst / talent scout.\n"
            "INSTRUCTIONS:\n"
            "- Always respond concisely. Use numbers. Be direct like a football scout, not an AI chatbot.\n"
            "- If asked something outside FIFA or player stats, say: 'I only know FIFA 19 data.'\n"
            "- Incorporate the retrieved player data below in your analysis.\n\n"
            "RETRIEVED DATA CONTEXT:\n"
        )

        if players:
            prompt += f"Player stats:\n{json.dumps(players, indent=2)}\n\n"
        else:
            prompt += f"Top 5 players in the dataset:\n{json.dumps(self.top_players_json[:5], indent=2)}\n\n"

        if req_pos or budget:
            prompt += f"Squad filter parameters: Position={req_pos}, Budget Limit={budget}\n\n"

        prompt += f"USER QUERY: {query}\n\nSCOUT REPORT:"

        # Try query Gemini API
        llm_response = self.query_gemini_api(prompt)
        if llm_response:
            return llm_response.strip()

        # Fallback to local rule-based system
        return self.local_fallback_scout(query, players, req_pos, budget)

assistant_service = AssistantService()
