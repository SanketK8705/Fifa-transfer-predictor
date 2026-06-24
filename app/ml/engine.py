import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.decomposition import PCA
from sklearn.metrics import (r2_score, mean_absolute_error,
                             cohen_kappa_score, matthews_corrcoef, confusion_matrix)

class MLEngine:
    def __init__(self, csv_path='data.csv'):
        self.csv_path = csv_path
        self._load_and_train()

    def _clean_currency(self, value):
        if pd.isnull(value): return 0
        value = str(value).encode('ascii','ignore').decode('ascii')
        value = value.replace('€','').replace(',','').strip()
        if 'M' in value:   return float(value.replace('M','')) * 1_000_000
        elif 'K' in value: return float(value.replace('K','')) * 1_000
        try:    return float(value) if value else 0
        except: return 0

    def _safe_int(self, val, default):
        try:
            v = float(val)
            return default if np.isnan(v) else int(v)
        except: return default

    def _safe_float(self, val, default):
        try:
            v = float(val)
            return default if np.isnan(v) else v
        except: return default

    def _load_and_train(self):
        print("\nloading dataset...")
        df_raw = pd.read_csv(self.csv_path, encoding='latin1', low_memory=False)
        df_raw['Value'] = df_raw['Value'].apply(self._clean_currency)
        df_raw['Wage']  = df_raw['Wage'].apply(self._clean_currency)
        self.df_raw = df_raw

        self.features = [
            'Age','Overall','Potential','Wage',
            'International Reputation','Weak Foot','Skill Moves','Position',
            'Crossing','Finishing','HeadingAccuracy','ShortPassing',
            'Dribbling','BallControl','Acceleration','SprintSpeed',
            'Reactions','ShotPower','Stamina','Strength','Vision'
        ]

        df = df_raw[df_raw['Value'] > 0].copy()
        self.df_ref = df
        df_model = df[self.features + ['Value']].dropna()

        self.le = LabelEncoder()
        df_model = df_model.copy()
        df_model['Position'] = self.le.fit_transform(df_model['Position'].astype(str))
        self.positions = list(self.le.classes_)

        X = df_model[self.features]
        y = df_model['Value']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42)

        self.scaler = StandardScaler()
        X_tr_sc = self.scaler.fit_transform(X_train)
        X_te_sc = self.scaler.transform(X_test)

        # regression
        print("training models...")
        self.lr = LinearRegression()
        self.lr.fit(X_tr_sc, y_train)

        self.rf = RandomForestRegressor(n_estimators=100, random_state=42)
        self.rf.fit(X_train, y_train)

        self.gb = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.gb.fit(X_train, y_train)

        p_lr = self.lr.predict(X_te_sc)
        p_rf = self.rf.predict(X_test)
        p_gb = self.gb.predict(X_test)

        self.reg_scores = {
            'lr': {'r2': round(r2_score(y_test,p_lr)*100,2), 'mae': round(mean_absolute_error(y_test,p_lr)/1e6,2)},
            'rf': {'r2': round(r2_score(y_test,p_rf)*100,2), 'mae': round(mean_absolute_error(y_test,p_rf)/1e6,2)},
            'gb': {'r2': round(r2_score(y_test,p_gb)*100,2), 'mae': round(mean_absolute_error(y_test,p_gb)/1e6,2)},
        }

        # PCA
        pca_full = PCA(n_components=21)
        pca_full.fit(X_tr_sc)
        cumvar = np.cumsum(pca_full.explained_variance_ratio_)
        n95 = int(np.argmax(cumvar >= 0.95)) + 1
        self.pca_final = PCA(n_components=n95)
        self.pca_final.fit(X_tr_sc)
        self.pca_stats = {
            'n_components':       n95,
            'total_features':     len(self.features),
            'variance_explained': round(float(cumvar[n95-1])*100, 2),
            'explained_ratios':   [round(float(r)*100,2) for r in pca_full.explained_variance_ratio_],
            'cumulative':         [round(float(c)*100,2) for c in cumvar],
        }

        # classification
        def to_cat(v):
            if v < 5e6:   return 'Low'
            if v < 20e6:  return 'Medium'
            if v < 60e6:  return 'High'
            return 'Elite'

        y_tr_cat = y_train.apply(to_cat)
        y_te_cat = y_test.apply(to_cat)
        self.le_cat = LabelEncoder()
        self.le_cat.fit(['Low','Medium','High','Elite'])
        y_tr_enc = self.le_cat.transform(y_tr_cat)
        y_te_enc = self.le_cat.transform(y_te_cat)

        self.clf_lr = LogisticRegression(max_iter=1000, random_state=42)
        self.clf_lr.fit(X_tr_sc, y_tr_enc)

        self.clf_rf = RandomForestClassifier(n_estimators=100, random_state=42)
        self.clf_rf.fit(X_train, y_tr_enc)

        self.clf_gb = GradientBoostingClassifier(n_estimators=100, random_state=42)
        self.clf_gb.fit(X_train, y_tr_enc)

        def clf_metrics(yt, yp):
            return {
                'accuracy': round(float(np.mean(yt==yp))*100, 2),
                'kappa':    round(float(cohen_kappa_score(yt,yp)), 4),
                'mcc':      round(float(matthews_corrcoef(yt,yp)), 4),
            }

        p_clf_lr = self.clf_lr.predict(X_te_sc)
        p_clf_rf = self.clf_rf.predict(X_test)
        p_clf_gb = self.clf_gb.predict(X_test)

        self.clf_scores = {
            'lr': clf_metrics(y_te_enc, p_clf_lr),
            'rf': clf_metrics(y_te_enc, p_clf_rf),
            'gb': clf_metrics(y_te_enc, p_clf_gb),
        }
        self.confusion_matrix = confusion_matrix(y_te_enc, p_clf_rf).tolist()
        self.cm_labels = list(self.le_cat.classes_)

        # store for chart data
        self.X_train = X_train
        self.y_train = y_train
        self.X_tr_sc = X_tr_sc

        self._load_famous_players()
        print("all models ready.")

    def _load_famous_players(self):
        names = [
            'L. Messi','Cristiano Ronaldo','Neymar Jr','K. De Bruyne',
            'E. Hazard','M. Salah','K. Mbappé','H. Kane',
            'R. Lewandowski','T. Kroos','Sergio Ramos',
            'M. ter Stegen','Alisson','V. van Dijk','A. Griezmann',
        ]
        result = []
        for name in names:
            row = self.df_raw[self.df_raw['Name'] == name]
            if row.empty:
                row = self.df_raw[self.df_raw['Name'].str.contains(
                    name.split('.')[-1].strip(), na=False)]
            if row.empty: continue
            row = row.iloc[0]
            pos = str(row.get('Position','ST')).strip()
            if pos not in self.le.classes_: pos = 'ST'
            result.append({
                'name':         name,
                'age':          self._safe_int(row.get('Age'), 25),
                'overall':      self._safe_int(row.get('Overall'), 85),
                'potential':    self._safe_int(row.get('Potential'), 85),
                'wage':         self._safe_float(row.get('Wage'), 100000),
                'reputation':   self._safe_int(row.get('International Reputation'), 3),
                'weakfoot':     self._safe_int(row.get('Weak Foot'), 3),
                'skillmoves':   self._safe_int(row.get('Skill Moves'), 3),
                'position':     pos,
                'crossing':     self._safe_int(row.get('Crossing'), 70),
                'finishing':    self._safe_int(row.get('Finishing'), 70),
                'heading':      self._safe_int(row.get('HeadingAccuracy'), 70),
                'passing':      self._safe_int(row.get('ShortPassing'), 70),
                'dribbling':    self._safe_int(row.get('Dribbling'), 70),
                'ballcontrol':  self._safe_int(row.get('BallControl'), 70),
                'acceleration': self._safe_int(row.get('Acceleration'), 70),
                'sprintspeed':  self._safe_int(row.get('SprintSpeed'), 70),
                'reactions':    self._safe_int(row.get('Reactions'), 70),
                'shotpower':    self._safe_int(row.get('ShotPower'), 70),
                'stamina':      self._safe_int(row.get('Stamina'), 70),
                'strength':     self._safe_int(row.get('Strength'), 70),
                'vision':       self._safe_int(row.get('Vision'), 70),
                'actual_value': self._safe_float(row.get('Value'), 0),
                'club':         str(row.get('Club','Unknown')),
                'nationality':  str(row.get('Nationality','Unknown')),
            })
        self.famous_players = result

    def predict(self, inp: dict) -> dict:
        input_df = pd.DataFrame(inp, index=[0])[self.features]
        input_sc = self.scaler.transform(input_df)

        p_gb = float(self.gb.predict(input_df)[0])
        p_rf = float(self.rf.predict(input_df)[0])
        p_lr = float(self.lr.predict(input_sc)[0])

        cat_enc  = self.clf_rf.predict(input_df)[0]
        category = self.le_cat.inverse_transform([cat_enc])[0]

        return {
            'gb': p_gb, 'rf': p_rf, 'lr': p_lr,
            'category': category,
        }

    def get_chart_data(self, inp: dict, predicted_value: float, player_name: str) -> dict:
        overall  = float(inp['Overall'])
        age      = float(inp['Age'])
        pred_m   = predicted_value / 1e6
        df_ref   = self.df_ref[['Name','Overall','Age','Value',
                                 'Dribbling','SprintSpeed','Finishing',
                                 'ShortPassing','Reactions','Vision',
                                 'Stamina','Strength']].dropna()

        # scatter: overall vs value (sample 500)
        sample = df_ref.sample(500, random_state=42)
        scatter_overall = {
            'all':    {'x': sample['Overall'].tolist(), 'y': (sample['Value']/1e6).round(2).tolist()},
            'player': {'x': overall, 'y': round(pred_m, 2), 'name': player_name},
        }

        # scatter: age vs value
        scatter_age = {
            'all':    {'x': sample['Age'].tolist(), 'y': (sample['Value']/1e6).round(2).tolist()},
            'player': {'x': age, 'y': round(pred_m, 2), 'name': player_name},
        }

        # similar players bar
        similar = df_ref[
            (df_ref['Overall'] >= overall-3) &
            (df_ref['Overall'] <= overall+3)
        ].sort_values('Value', ascending=False).head(10)
        similar_bar = {
            'names':  list(similar['Name']) + [f'★ {player_name}'],
            'values': (similar['Value']/1e6).round(2).tolist() + [round(pred_m,2)],
        }

        # radar
        radar = {
            'labels': ['Dribbling','Sprint Speed','Finishing','Passing','Reactions','Vision'],
            'values': [
                float(inp['Dribbling']), float(inp['SprintSpeed']),
                float(inp['Finishing']), float(inp['ShortPassing']),
                float(inp['Reactions']), float(inp['Vision']),
            ],
        }

        # 3 model comparison
        input_df = pd.DataFrame(inp, index=[0])[self.features]
        input_sc = self.scaler.transform(input_df)
        model_compare = {
            'models': ['Linear Regression','Random Forest','Gradient Boosting'],
            'values': [
                round(float(self.lr.predict(input_sc)[0])/1e6, 2),
                round(float(self.rf.predict(input_df)[0])/1e6, 2),
                round(float(self.gb.predict(input_df)[0])/1e6, 2),
            ],
        }

        # feature importance
        fi = sorted(zip(self.features, self.gb.feature_importances_),
                    key=lambda x: x[1], reverse=True)[:10]
        feature_importance = {
            'features': [f for f,_ in fi],
            'values':   [round(float(v),4) for _,v in fi],
        }

        # value distribution (histogram buckets)
        vals = self.df_ref[self.df_ref['Value'] < 50e6]['Value'] / 1e6
        counts, edges = np.histogram(vals, bins=30)
        value_dist = {
            'edges':  [round(float(e),1) for e in edges[:-1]],
            'counts': counts.tolist(),
            'player_value': round(pred_m, 2),
            'player_name':  player_name,
        }

        # position avg comparison
        pos_enc  = float(inp['Position'])
        pos_rows = self.df_ref.copy()
        pos_rows['Position_enc'] = self.le.transform(
            pos_rows['Position'].astype(str).apply(
                lambda p: p if p in self.le.classes_ else self.le.classes_[0]))
        pos_rows = pos_rows[pos_rows['Position_enc'] == pos_enc]
        stat_cols = ['Dribbling','SprintSpeed','Finishing','ShortPassing',
                     'Reactions','Vision','Stamina','Strength']
        pos_compare = {
            'stats':    stat_cols,
            'pos_avg':  [round(pos_rows[c].mean(),1) if c in pos_rows else 70 for c in stat_cols],
            'player':   [float(inp[c]) for c in stat_cols],
            'pos_name': str(inp.get('_position_label','—')),
        }

        return {
            'scatter_overall':   scatter_overall,
            'scatter_age':       scatter_age,
            'similar_players':   similar_bar,
            'radar':             radar,
            'model_compare':     model_compare,
            'feature_importance':feature_importance,
            'value_distribution':value_dist,
            'position_compare':  pos_compare,
        }

    def get_analysis_data(self) -> dict:
        # PCA 2D scatter (sample 800)
        from sklearn.decomposition import PCA as _PCA
        pca2 = _PCA(n_components=2)
        X_2d = pca2.fit_transform(self.X_tr_sc[:800])
        cats  = self.y_train.iloc[:800].apply(
            lambda v: 'Low' if v<5e6 else 'Medium' if v<20e6 else 'High' if v<60e6 else 'Elite')
        pca_scatter = {c: {'x':[], 'y':[]} for c in ['Low','Medium','High','Elite']}
        for i, cat in enumerate(cats):
            pca_scatter[cat]['x'].append(round(float(X_2d[i,0]),3))
            pca_scatter[cat]['y'].append(round(float(X_2d[i,1]),3))
        return {
            'pca_stats':      self.pca_stats,
            'pca_scatter':    pca_scatter,
            'clf_scores':     self.clf_scores,
            'confusion_matrix': self.confusion_matrix,
            'cm_labels':      self.cm_labels,
            'reg_scores':     self.reg_scores,
        }

    def search_players(self, query: str, limit: int = 10) -> list:
        q = query.strip().lower()
        if not q: return []
        mask = self.df_raw['Name'].str.lower().str.contains(q, na=False)
        rows = self.df_raw[mask].head(limit)
        result = []
        for _, row in rows.iterrows():
            pos = str(row.get('Position','ST')).strip()
            if pos not in self.le.classes_: pos = 'ST'
            result.append({
                'name':        str(row.get('Name','')),
                'club':        str(row.get('Club','Unknown')),
                'nationality': str(row.get('Nationality','Unknown')),
                'overall':     self._safe_int(row.get('Overall'), 70),
                'position':    pos,
                'age':         self._safe_int(row.get('Age'), 25),
                'value':       self._safe_float(row.get('Value'), 0) / 1e6,
            })
        return result


# singleton — loaded once, shared across all requests
engine = MLEngine()