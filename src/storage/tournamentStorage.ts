import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Bracket, Fencer, Poule } from "../engine/types";

export type TournamentState = {
  fencers: Fencer[];
  poules: Poule[];
  bracket?: Bracket;
  updatedAt: string;
};

const KEY = "sclass-current-tournament";

export async function saveTournament(state: TournamentState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
}

export async function loadTournament(): Promise<TournamentState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearTournament(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function exportTournamentJson(state: TournamentState): Promise<void> {
  const json = JSON.stringify(state, null, 2);
  const filename = `sclass-tournament-${new Date().toISOString().slice(0, 10)}.json`;
  const uri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}
